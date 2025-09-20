import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

// Import our modules
import database from './database/database.js';
import TradingAlgorithms from './algorithms/tradingAlgorithms.js';
import APIService from './services/apiService.js';

// Import routes
import priceRoutes from './routes/priceRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import algorithmRoutes from './routes/algorithmRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

class AlphaFxTraderServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 3001;
    this.tradingAlgorithms = new TradingAlgorithms();
    this.apiService = new APIService();
    
    // Trading state
    this.isAutoTrading = process.env.AUTO_TRADING_ENABLED === 'true';
    this.maxTradingVolume = parseInt(process.env.MAX_TRADING_VOLUME) || 10000000;
    this.currentTradingVolume = 0;
    this.tradingSession = null;
    
    // Connected clients
    this.connectedClients = new Set();
    
    this.initializeServer();
  }

  async initializeServer() {
    try {
      // Connect to database
      await database.connect(process.env.DB_PATH);
      console.log('✅ Database connected successfully');

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup WebSocket
      this.setupWebSocket();

      // Setup scheduled tasks
      this.setupScheduledTasks();

      // Start server
      this.startServer();

    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        const apiHealth = await this.apiService.healthCheck();
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: dbHealth,
          api: apiHealth,
          trading: {
            autoTrading: this.isAutoTrading,
            currentVolume: this.currentTradingVolume,
            maxVolume: this.maxTradingVolume,
            sessionActive: !!this.tradingSession
          }
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // API routes
    this.app.use('/api/prices', priceRoutes);
    this.app.use('/api/trades', tradeRoutes);
    this.app.use('/api/algorithms', algorithmRoutes);
    this.app.use('/api/notifications', notificationRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send current trading session info
      if (this.tradingSession) {
        socket.emit('trading_session_update', this.tradingSession);
      }

      // Handle client disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle trade execution requests
      socket.on('execute_trade', async (tradeData) => {
        try {
          const trade = await this.executeTrade(tradeData);
          socket.emit('trade_executed', trade);
          this.broadcastTradeUpdate(trade);
        } catch (error) {
          socket.emit('trade_error', { error: error.message });
        }
      });

      // Handle algorithm analysis requests
      socket.on('analyze_symbol', async (symbol) => {
        try {
          const analysis = await this.analyzeSymbol(symbol);
          socket.emit('analysis_result', { symbol, analysis });
        } catch (error) {
          socket.emit('analysis_error', { symbol, error: error.message });
        }
      });
    });
  }

  setupScheduledTasks() {
    // Update prices every 5 seconds
    cron.schedule('*/5 * * * * *', async () => {
      await this.updatePrices();
    });

    // Run trading algorithms every 10 seconds
    cron.schedule('*/10 * * * * *', async () => {
      if (this.isAutoTrading && this.currentTradingVolume < this.maxTradingVolume) {
        await this.runTradingAlgorithms();
      }
    });

    // Update trading session every minute
    cron.schedule('0 * * * * *', async () => {
      await this.updateTradingSession();
    });

    // Clean up old data every hour
    cron.schedule('0 0 * * * *', async () => {
      await this.cleanupOldData();
    });
  }

  async updatePrices() {
    try {
      const prices = await this.apiService.getCurrentRates();
      
      // Store prices in database
      for (const price of prices) {
        await database.run(
          `INSERT INTO price_data (symbol, bid_price, ask_price, mid_price, timestamp) 
           VALUES (?, ?, ?, ?, ?)`,
          [price.symbol, price.bid, price.ask, price.price, price.timestamp]
        );

        // Add to trading algorithms
        this.tradingAlgorithms.addPriceData(price.symbol, price.price, price.timestamp);
      }

      // Broadcast to connected clients
      this.broadcastPriceUpdate(prices);

    } catch (error) {
      console.error('Failed to update prices:', error.message);
    }
  }

  async runTradingAlgorithms() {
    try {
      const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
      
      for (const symbol of symbols) {
        // Run combined strategy
        const signal = this.tradingAlgorithms.combinedStrategy(symbol);
        
        if (signal.signal !== 'HOLD' && signal.confidence > 0.6) {
          // Execute trade based on signal
          const tradeData = {
            symbol,
            action: signal.signal,
            quantity: 10000, // Fixed quantity for auto-trading
            algorithm: 'COMBINED',
            confidence: signal.confidence,
            reasons: signal.reasons
          };

          await this.executeTrade(tradeData);
        }
      }
    } catch (error) {
      console.error('Failed to run trading algorithms:', error.message);
    }
  }

  async executeTrade(tradeData) {
    try {
      // Get current price
      const priceData = await database.get(
        `SELECT * FROM price_data WHERE symbol = ? ORDER BY timestamp DESC LIMIT 1`,
        [tradeData.symbol]
      );

      if (!priceData) {
        throw new Error(`No price data available for ${tradeData.symbol}`);
      }

      const tradePrice = tradeData.action === 'BUY' ? priceData.ask_price : priceData.bid_price;
      const tradeId = uuidv4();

      // Create trade record
      const trade = {
        id: tradeId,
        symbol: tradeData.symbol,
        action: tradeData.action,
        quantity: tradeData.quantity,
        price: tradePrice,
        status: 'FILLED',
        algorithm_used: tradeData.algorithm || 'MANUAL',
        created_at: new Date(),
        filled_at: new Date()
      };

      // Store in database
      await database.run(
        `INSERT INTO trades (id, symbol, action, quantity, price, status, algorithm_used, created_at, filled_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [trade.id, trade.symbol, trade.action, trade.quantity, trade.price, 
         trade.status, trade.algorithm_used, trade.created_at, trade.filled_at]
      );

      // Update trading volume
      this.currentTradingVolume += trade.quantity * trade.price;

      // Create notification
      await this.createNotification({
        type: 'TRADE_EXECUTED',
        title: 'Trade Executed',
        message: `${trade.action} ${trade.quantity.toLocaleString()} ${trade.symbol} at ${trade.price}`,
        symbol: trade.symbol
      });

      console.log(`✅ Trade executed: ${trade.action} ${trade.quantity} ${trade.symbol} at ${trade.price}`);

      return trade;

    } catch (error) {
      console.error('Failed to execute trade:', error.message);
      throw error;
    }
  }

  async analyzeSymbol(symbol) {
    try {
      const smaSignal = this.tradingAlgorithms.smaCrossover(symbol);
      const rsiSignal = this.tradingAlgorithms.rsiStrategy(symbol);
      const bbSignal = this.tradingAlgorithms.bollingerBandsStrategy(symbol);
      const combinedSignal = this.tradingAlgorithms.combinedStrategy(symbol);
      const indicators = this.tradingAlgorithms.getIndicators(symbol);

      return {
        symbol,
        signals: {
          sma: smaSignal,
          rsi: rsiSignal,
          bollinger: bbSignal,
          combined: combinedSignal
        },
        indicators,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Failed to analyze ${symbol}:`, error.message);
      throw error;
    }
  }

  async createNotification(notificationData) {
    try {
      await database.run(
        `INSERT INTO notifications (type, title, message, symbol, created_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [notificationData.type, notificationData.title, notificationData.message, 
         notificationData.symbol, new Date()]
      );

      // Broadcast to connected clients
      this.io.emit('notification', {
        ...notificationData,
        id: Date.now(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to create notification:', error.message);
    }
  }

  async updateTradingSession() {
    try {
      if (!this.tradingSession) {
        // Start new session
        this.tradingSession = {
          id: uuidv4(),
          startTime: new Date(),
          totalVolume: 0,
          totalTrades: 0,
          totalPnl: 0,
          status: 'ACTIVE'
        };

        await database.run(
          `INSERT INTO trading_sessions (session_name, start_time, status) VALUES (?, ?, ?)`,
          [this.tradingSession.id, this.tradingSession.startTime, 'ACTIVE']
        );
      }

      // Update session statistics
      const stats = await database.get(
        `SELECT COUNT(*) as total_trades, SUM(quantity * price) as total_volume, SUM(pnl) as total_pnl 
         FROM trades WHERE created_at >= ?`,
        [this.tradingSession.startTime]
      );

      this.tradingSession.totalTrades = stats.total_trades || 0;
      this.tradingSession.totalVolume = stats.total_volume || 0;
      this.tradingSession.totalPnl = stats.total_pnl || 0;

      // Check if we should stop auto-trading
      if (this.currentTradingVolume >= this.maxTradingVolume) {
        this.isAutoTrading = false;
        this.tradingSession.status = 'STOPPED';
        
        await this.createNotification({
          type: 'SYSTEM',
          title: 'Auto Trading Stopped',
          message: `Trading volume limit of ${this.maxTradingVolume.toLocaleString()} reached`
        });
      }

      // Broadcast session update
      this.io.emit('trading_session_update', this.tradingSession);

    } catch (error) {
      console.error('Failed to update trading session:', error.message);
    }
  }

  async cleanupOldData() {
    try {
      // Keep only last 7 days of price data
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      await database.run(
        `DELETE FROM price_data WHERE timestamp < ?`,
        [cutoffDate]
      );

      // Keep only last 30 days of technical indicators
      await database.run(
        `DELETE FROM technical_indicators WHERE timestamp < ?`,
        [cutoffDate]
      );

      console.log('✅ Old data cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup old data:', error.message);
    }
  }

  broadcastPriceUpdate(prices) {
    this.io.emit('price_update', {
      prices,
      timestamp: new Date()
    });
  }

  broadcastTradeUpdate(trade) {
    this.io.emit('trade_update', {
      trade,
      timestamp: new Date()
    });
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log(`🚀 AlphaFxTrader Server running on port ${this.port}`);
      console.log(`📊 WebSocket server ready for real-time connections`);
      console.log(`🤖 Auto-trading: ${this.isAutoTrading ? 'ENABLED' : 'DISABLED'}`);
      console.log(`💰 Max trading volume: ${this.maxTradingVolume.toLocaleString()}`);
      console.log(`🌐 Health check: http://localhost:${this.port}/health`);
    });
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down server...');
    
    // Stop auto-trading
    this.isAutoTrading = false;
    
    // Close database connection
    await database.close();
    
    // Close server
    this.server.close(() => {
      console.log('✅ Server shut down successfully');
      process.exit(0);
    });
  }
}

// Create and start server
const server = new AlphaFxTraderServer();

// Handle graceful shutdown
process.on('SIGINT', () => server.shutdown());
process.on('SIGTERM', () => server.shutdown());

export default server;

