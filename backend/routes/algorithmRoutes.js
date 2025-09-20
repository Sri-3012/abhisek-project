import express from 'express';
import database from '../database/database.js';
import TradingAlgorithms from '../algorithms/tradingAlgorithms.js';

const router = express.Router();
const tradingAlgorithms = new TradingAlgorithms();

/**
 * GET /api/algorithms/performance
 * Get performance metrics for all trading algorithms
 */
router.get('/performance', async (req, res) => {
  try {
    const { period = '1M' } = req.query;

    let timeFilter = '';
    switch (period) {
      case '1D':
        timeFilter = "datetime('now', '-1 day')";
        break;
      case '1W':
        timeFilter = "datetime('now', '-7 days')";
        break;
      case '1M':
        timeFilter = "datetime('now', '-30 days')";
        break;
      case '3M':
        timeFilter = "datetime('now', '-90 days')";
        break;
      default:
        timeFilter = "datetime('now', '-30 days')";
    }

    const performance = await database.all(`
      SELECT 
        algorithm_used,
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(pnl) as total_pnl,
        AVG(pnl) as average_pnl,
        MAX(pnl) as max_profit,
        MIN(pnl) as max_loss,
        SUM(quantity * price) as total_volume
      FROM trades 
      WHERE created_at >= ${timeFilter} AND status = 'FILLED'
      GROUP BY algorithm_used
      ORDER BY total_pnl DESC
    `);

    const result = performance.map(perf => {
      const winRate = perf.total_trades > 0 
        ? (perf.winning_trades / perf.total_trades) * 100 
        : 0;

      return {
        algorithm: perf.algorithm_used,
        totalTrades: perf.total_trades,
        winningTrades: perf.winning_trades,
        losingTrades: perf.total_trades - perf.winning_trades,
        winRate: parseFloat(winRate.toFixed(2)),
        totalPnl: perf.total_pnl,
        averagePnl: perf.average_pnl,
        maxProfit: perf.max_profit,
        maxLoss: perf.max_loss,
        totalVolume: perf.total_volume,
        profitFactor: perf.max_loss !== 0 
          ? Math.abs(perf.max_profit / perf.max_loss) 
          : 0
      };
    });

    res.json({
      period,
      algorithms: result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching algorithm performance:', error);
    res.status(500).json({ error: 'Failed to fetch algorithm performance' });
  }
});

/**
 * GET /api/algorithms/backtest
 * Get backtest results for trading algorithms
 */
router.get('/backtest', async (req, res) => {
  try {
    const { algorithm, symbol, startDate, endDate } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (algorithm) {
      whereClause += ' AND algorithm_name = ?';
      params.push(algorithm);
    }

    if (symbol) {
      whereClause += ' AND symbol = ?';
      params.push(symbol);
    }

    if (startDate) {
      whereClause += ' AND start_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND end_date <= ?';
      params.push(endDate);
    }

    const backtests = await database.all(`
      SELECT 
        algorithm_name,
        symbol,
        start_date,
        end_date,
        initial_capital,
        final_capital,
        total_return,
        sharpe_ratio,
        max_drawdown,
        total_trades,
        win_rate,
        parameters,
        created_at
      FROM backtest_results 
      ${whereClause}
      ORDER BY total_return DESC
    `, params);

    res.json(backtests);
  } catch (error) {
    console.error('Error fetching backtest results:', error);
    res.status(500).json({ error: 'Failed to fetch backtest results' });
  }
});

/**
 * POST /api/algorithms/backtest
 * Run a new backtest for a trading algorithm
 */
router.post('/backtest', async (req, res) => {
  try {
    const { 
      algorithm, 
      symbol, 
      startDate, 
      endDate, 
      initialCapital = 10000,
      parameters = {} 
    } = req.body;

    // Validate input
    if (!algorithm || !symbol || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: algorithm, symbol, startDate, endDate' 
      });
    }

    // Get historical price data for backtesting
    const priceData = await database.all(`
      SELECT mid_price, timestamp 
      FROM price_data 
      WHERE symbol = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `, [symbol, startDate, endDate]);

    if (priceData.length < 50) {
      return res.status(400).json({ 
        error: 'Insufficient historical data for backtesting' 
      });
    }

    // Add price data to trading algorithms
    priceData.forEach(price => {
      tradingAlgorithms.addPriceData(symbol, price.mid_price, new Date(price.timestamp));
    });

    // Run backtest simulation
    const backtestResults = await runBacktest(
      algorithm, 
      symbol, 
      priceData, 
      initialCapital, 
      parameters
    );

    // Store backtest results
    const backtestId = await database.run(`
      INSERT INTO backtest_results (
        algorithm_name, symbol, start_date, end_date, initial_capital,
        final_capital, total_return, sharpe_ratio, max_drawdown,
        total_trades, win_rate, parameters, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      algorithm, symbol, startDate, endDate, initialCapital,
      backtestResults.finalCapital, backtestResults.totalReturn,
      backtestResults.sharpeRatio, backtestResults.maxDrawdown,
      backtestResults.totalTrades, backtestResults.winRate,
      JSON.stringify(parameters), new Date()
    ]);

    res.status(201).json({
      id: backtestId.lastID,
      ...backtestResults,
      algorithm,
      symbol,
      startDate,
      endDate,
      initialCapital,
      parameters
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: 'Failed to run backtest' });
  }
});

/**
 * GET /api/algorithms/signals
 * Get current trading signals for all symbols
 */
router.get('/signals', async (req, res) => {
  try {
    const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
    const signals = {};

    for (const symbol of symbols) {
      try {
        // Get recent price data
        const priceData = await database.all(`
          SELECT mid_price, timestamp 
          FROM price_data 
          WHERE symbol = ? 
          ORDER BY timestamp DESC 
          LIMIT 50
        `, [symbol]);

        if (priceData.length >= 20) {
          // Add prices to trading algorithms
          priceData.reverse().forEach(price => {
            tradingAlgorithms.addPriceData(symbol, price.mid_price, new Date(price.timestamp));
          });

          // Get signals from all algorithms
          signals[symbol] = {
            sma: tradingAlgorithms.smaCrossover(symbol),
            rsi: tradingAlgorithms.rsiStrategy(symbol),
            bollinger: tradingAlgorithms.bollingerBandsStrategy(symbol),
            combined: tradingAlgorithms.combinedStrategy(symbol),
            indicators: tradingAlgorithms.getIndicators(symbol)
          };
        }
      } catch (error) {
        console.warn(`Failed to get signals for ${symbol}:`, error.message);
        signals[symbol] = { error: 'Insufficient data' };
      }
    }

    res.json({
      signals,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching trading signals:', error);
    res.status(500).json({ error: 'Failed to fetch trading signals' });
  }
});

/**
 * GET /api/algorithms/signals/:symbol
 * Get trading signals for a specific symbol
 */
router.get('/signals/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { algorithms = ['sma', 'rsi', 'bollinger', 'combined'] } = req.query;

    // Get recent price data
    const priceData = await database.all(`
      SELECT mid_price, timestamp 
      FROM price_data 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `, [symbol]);

    if (priceData.length < 20) {
      return res.status(400).json({ 
        error: 'Insufficient price data for signal generation' 
      });
    }

    // Add prices to trading algorithms
    priceData.reverse().forEach(price => {
      tradingAlgorithms.addPriceData(symbol, price.mid_price, new Date(price.timestamp));
    });

    const signals = {};

    if (algorithms.includes('sma')) {
      signals.sma = tradingAlgorithms.smaCrossover(symbol);
    }

    if (algorithms.includes('rsi')) {
      signals.rsi = tradingAlgorithms.rsiStrategy(symbol);
    }

    if (algorithms.includes('bollinger')) {
      signals.bollinger = tradingAlgorithms.bollingerBandsStrategy(symbol);
    }

    if (algorithms.includes('combined')) {
      signals.combined = tradingAlgorithms.combinedStrategy(symbol);
    }

    signals.indicators = tradingAlgorithms.getIndicators(symbol);
    signals.dataPoints = priceData.length;

    res.json({
      symbol,
      signals,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching signals for symbol:', error);
    res.status(500).json({ error: 'Failed to fetch trading signals' });
  }
});

/**
 * Helper function to run backtest simulation
 */
async function runBacktest(algorithm, symbol, priceData, initialCapital, parameters) {
  const trades = [];
  let capital = initialCapital;
  let position = 0;
  let maxCapital = initialCapital;
  let maxDrawdown = 0;

  // Simulate trading based on algorithm signals
  for (let i = 20; i < priceData.length; i++) {
    const currentPrice = priceData[i].mid_price;
    const currentTime = new Date(priceData[i].timestamp);

    // Add price to algorithms
    tradingAlgorithms.addPriceData(symbol, currentPrice, currentTime);

    let signal = null;

    // Get signal based on algorithm
    switch (algorithm.toLowerCase()) {
      case 'sma_crossover':
        signal = tradingAlgorithms.smaCrossover(symbol, parameters.shortPeriod, parameters.longPeriod);
        break;
      case 'rsi':
        signal = tradingAlgorithms.rsiStrategy(symbol, parameters.period, parameters.overbought, parameters.oversold);
        break;
      case 'bollinger':
        signal = tradingAlgorithms.bollingerBandsStrategy(symbol, parameters.period, parameters.stdDev);
        break;
      case 'combined':
        signal = tradingAlgorithms.combinedStrategy(symbol);
        break;
    }

    // Execute trade based on signal
    if (signal && signal.signal !== 'HOLD' && signal.confidence > 0.5) {
      const quantity = Math.floor(capital * 0.1 / currentPrice); // Use 10% of capital

      if (quantity > 0) {
        if (signal.signal === 'BUY' && position <= 0) {
          // Buy
          const cost = quantity * currentPrice;
          if (cost <= capital) {
            capital -= cost;
            position += quantity;
            
            trades.push({
              action: 'BUY',
              quantity,
              price: currentPrice,
              timestamp: currentTime,
              capital: capital + position * currentPrice
            });
          }
        } else if (signal.signal === 'SELL' && position > 0) {
          // Sell
          const proceeds = position * currentPrice;
          capital += proceeds;
          
          const pnl = proceeds - (position * priceData[i-1].mid_price);
          
          trades.push({
            action: 'SELL',
            quantity: position,
            price: currentPrice,
            timestamp: currentTime,
            pnl,
            capital
          });
          
          position = 0;
        }
      }
    }

    // Update max capital and drawdown
    const currentCapital = capital + position * currentPrice;
    if (currentCapital > maxCapital) {
      maxCapital = currentCapital;
    }
    
    const drawdown = (maxCapital - currentCapital) / maxCapital;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Close any remaining position
  if (position > 0) {
    const finalPrice = priceData[priceData.length - 1].mid_price;
    const proceeds = position * finalPrice;
    capital += proceeds;
    
    trades.push({
      action: 'SELL',
      quantity: position,
      price: finalPrice,
      timestamp: new Date(priceData[priceData.length - 1].timestamp),
      capital
    });
  }

  // Calculate performance metrics
  const finalCapital = capital;
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  // Calculate Sharpe ratio (simplified)
  const returns = trades.filter(t => t.pnl !== undefined).map(t => t.pnl);
  const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
  const variance = returns.length > 0 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
  const sharpeRatio = Math.sqrt(variance) > 0 ? avgReturn / Math.sqrt(variance) : 0;

  return {
    finalCapital,
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    totalTrades,
    winningTrades,
    winRate: parseFloat(winRate.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
    trades
  };
}

export default router;

