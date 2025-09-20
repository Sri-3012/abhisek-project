// Mock data service for simulating forex trading data
import { format } from 'date-fns';

// Currency pairs with base prices
const CURRENCY_PAIRS = [
  { symbol: 'EUR/USD', basePrice: 1.0850, spread: 0.0002 },
  { symbol: 'GBP/USD', basePrice: 1.2650, spread: 0.0003 },
  { symbol: 'USD/JPY', basePrice: 149.50, spread: 0.05 },
  { symbol: 'AUD/USD', basePrice: 0.6580, spread: 0.0002 },
  { symbol: 'USD/CAD', basePrice: 1.3650, spread: 0.0003 },
];

// Price history for moving averages
const priceHistory = new Map();

// Initialize price history for each pair
CURRENCY_PAIRS.forEach(pair => {
  priceHistory.set(pair.symbol, []);
});

// Generate random price movement
function generatePriceMovement(basePrice, volatility = 0.001) {
  const change = (Math.random() - 0.5) * volatility * basePrice;
  return basePrice + change;
}

// Calculate Simple Moving Average
function calculateSMA(prices, period = 20) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return sum / period;
}

// Calculate Exponential Moving Average
function calculateEMA(prices, period = 20) {
  if (prices.length < 1) return null;
  if (prices.length === 1) return prices[0];
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

// Generate mock trade
function generateMockTrade() {
  const pair = CURRENCY_PAIRS[Math.floor(Math.random() * CURRENCY_PAIRS.length)];
  const action = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const quantity = Math.floor(Math.random() * 100000) + 10000; // 10k to 110k
  const price = generatePriceMovement(pair.basePrice);
  const timestamp = new Date();
  
  return {
    id: `T${Date.now()}${Math.floor(Math.random() * 1000)}`,
    timestamp,
    pair: pair.symbol,
    action,
    quantity,
    price: parseFloat(price.toFixed(5)),
    status: 'FILLED',
    pnl: action === 'BUY' ? 
      (Math.random() - 0.5) * 1000 : 
      (Math.random() - 0.5) * 1000
  };
}

// Mock API endpoints
export const mockAPI = {
  // Get current prices for all pairs
  getPrices: () => {
    return CURRENCY_PAIRS.map(pair => {
      const currentPrice = generatePriceMovement(pair.basePrice);
      const history = priceHistory.get(pair.symbol);
      history.push(currentPrice);
      
      // Keep only last 100 prices for performance
      if (history.length > 100) {
        history.shift();
      }
      
      const sma = calculateSMA(history);
      const ema = calculateEMA(history);
      
      return {
        symbol: pair.symbol,
        bid: parseFloat((currentPrice - pair.spread / 2).toFixed(5)),
        ask: parseFloat((currentPrice + pair.spread / 2).toFixed(5)),
        price: parseFloat(currentPrice.toFixed(5)),
        change: history.length > 1 ? 
          parseFloat(((currentPrice - history[history.length - 2]) / history[history.length - 2] * 100).toFixed(2)) : 0,
        timestamp: new Date(),
        sma: sma ? parseFloat(sma.toFixed(5)) : null,
        ema: ema ? parseFloat(ema.toFixed(5)) : null,
        history: [...history]
      };
    });
  },

  // Get price history for a specific pair
  getPriceHistory: (symbol, period = 50) => {
    const history = priceHistory.get(symbol) || [];
    return history.slice(-period).map((price, index) => ({
      time: new Date(Date.now() - (history.length - index - 1) * 1000),
      price: parseFloat(price.toFixed(5)),
      sma: calculateSMA(history.slice(0, index + 1)),
      ema: calculateEMA(history.slice(0, index + 1))
    }));
  },

  // Execute a trade
  executeTrade: (pair, action, quantity) => {
    const trade = {
      id: `T${Date.now()}${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date(),
      pair,
      action,
      quantity,
      price: generatePriceMovement(CURRENCY_PAIRS.find(p => p.symbol === pair)?.basePrice || 1.0),
      status: 'FILLED',
      pnl: (Math.random() - 0.5) * 1000
    };
    
    return Promise.resolve(trade);
  },

  // Get trade history
  getTradeHistory: () => {
    const trades = [];
    for (let i = 0; i < 20; i++) {
      trades.push(generateMockTrade());
    }
    return trades.sort((a, b) => b.timestamp - a.timestamp);
  },

  // Get notifications/alerts
  getNotifications: () => {
    const notifications = [
      {
        id: 1,
        type: 'price_alert',
        message: 'EUR/USD crossed above 1.0900',
        timestamp: new Date(Date.now() - 30000),
        read: false
      },
      {
        id: 2,
        type: 'trade_executed',
        message: 'Trade executed: BUY 50,000 EUR/USD at 1.0852',
        timestamp: new Date(Date.now() - 60000),
        read: false
      },
      {
        id: 3,
        type: 'system',
        message: 'System maintenance scheduled for tonight at 2 AM UTC',
        timestamp: new Date(Date.now() - 300000),
        read: true
      }
    ];
    
    return notifications;
  }
};

// Simulate real-time data updates
export class DataStream {
  constructor() {
    this.subscribers = new Map();
    this.intervals = new Map();
  }

  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type).add(callback);

    // Start interval if not already running
    if (!this.intervals.has(type)) {
      const interval = setInterval(() => {
        this.notifySubscribers(type);
      }, 1000); // Update every second
      this.intervals.set(type, interval);
    }

    return () => this.unsubscribe(type, callback);
  }

  unsubscribe(type, callback) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).delete(callback);
      
      // Stop interval if no more subscribers
      if (this.subscribers.get(type).size === 0) {
        const interval = this.intervals.get(type);
        if (interval) {
          clearInterval(interval);
          this.intervals.delete(type);
        }
      }
    }
  }

  notifySubscribers(type) {
    if (this.subscribers.has(type)) {
      const data = mockAPI[type]();
      this.subscribers.get(type).forEach(callback => callback(data));
    }
  }

  destroy() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.subscribers.clear();
  }
}

export const dataStream = new DataStream();
