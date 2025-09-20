import express from 'express';
import database from '../database/database.js';
import TradingAlgorithms from '../algorithms/tradingAlgorithms.js';

const router = express.Router();
const tradingAlgorithms = new TradingAlgorithms();

/**
 * GET /api/prices
 * Get current prices for all currency pairs
 */
router.get('/', async (req, res) => {
  try {
    const prices = await database.all(`
      SELECT 
        pd.symbol,
        pd.bid_price as bid,
        pd.ask_price as ask,
        pd.mid_price as price,
        pd.timestamp,
        ti_short.value as sma_short,
        ti_long.value as sma_long,
        ti_rsi.value as rsi,
        ti_bb_upper.value as bb_upper,
        ti_bb_middle.value as bb_middle,
        ti_bb_lower.value as bb_lower
      FROM price_data pd
      LEFT JOIN technical_indicators ti_short ON pd.symbol = ti_short.symbol 
        AND ti_short.indicator_type = 'SMA' AND ti_short.period = 10
      LEFT JOIN technical_indicators ti_long ON pd.symbol = ti_long.symbol 
        AND ti_long.indicator_type = 'SMA' AND ti_long.period = 20
      LEFT JOIN technical_indicators ti_rsi ON pd.symbol = ti_rsi.symbol 
        AND ti_rsi.indicator_type = 'RSI' AND ti_rsi.period = 14
      LEFT JOIN technical_indicators ti_bb_upper ON pd.symbol = ti_bb_upper.symbol 
        AND ti_bb_upper.indicator_type = 'BOLLINGER_UPPER'
      LEFT JOIN technical_indicators ti_bb_middle ON pd.symbol = ti_bb_middle.symbol 
        AND ti_bb_middle.indicator_type = 'BOLLINGER_MIDDLE'
      LEFT JOIN technical_indicators ti_bb_lower ON pd.symbol = ti_bb_lower.symbol 
        AND ti_bb_lower.indicator_type = 'BOLLINGER_LOWER'
      WHERE pd.timestamp >= datetime('now', '-1 minute')
      ORDER BY pd.timestamp DESC
    `);

    // Group by symbol and get latest price for each
    const latestPrices = {};
    prices.forEach(price => {
      if (!latestPrices[price.symbol] || new Date(price.timestamp) > new Date(latestPrices[price.symbol].timestamp)) {
        latestPrices[price.symbol] = price;
      }
    });

    const result = Object.values(latestPrices).map(price => ({
      symbol: price.symbol,
      bid: price.bid,
      ask: price.ask,
      price: price.price,
      timestamp: price.timestamp,
      sma: price.sma_long,
      ema: price.sma_short, // Using short SMA as EMA approximation
      rsi: price.rsi,
      bollinger: {
        upper: price.bb_upper,
        middle: price.bb_middle,
        lower: price.bb_lower
      }
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

/**
 * GET /api/prices/:symbol
 * Get current price for a specific currency pair
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const price = await database.get(`
      SELECT 
        pd.symbol,
        pd.bid_price as bid,
        pd.ask_price as ask,
        pd.mid_price as price,
        pd.timestamp,
        ti_short.value as sma_short,
        ti_long.value as sma_long,
        ti_rsi.value as rsi
      FROM price_data pd
      LEFT JOIN technical_indicators ti_short ON pd.symbol = ti_short.symbol 
        AND ti_short.indicator_type = 'SMA' AND ti_short.period = 10
      LEFT JOIN technical_indicators ti_long ON pd.symbol = ti_long.symbol 
        AND ti_long.indicator_type = 'SMA' AND ti_long.period = 20
      LEFT JOIN technical_indicators ti_rsi ON pd.symbol = ti_rsi.symbol 
        AND ti_rsi.indicator_type = 'RSI' AND ti_rsi.period = 14
      WHERE pd.symbol = ? 
      ORDER BY pd.timestamp DESC 
      LIMIT 1
    `, [symbol]);

    if (!price) {
      return res.status(404).json({ error: 'Price data not found for symbol' });
    }

    res.json({
      symbol: price.symbol,
      bid: price.bid,
      ask: price.ask,
      price: price.price,
      timestamp: price.timestamp,
      sma: price.sma_long,
      ema: price.sma_short,
      rsi: price.rsi
    });
  } catch (error) {
    console.error('Error fetching price for symbol:', error);
    res.status(500).json({ error: 'Failed to fetch price data' });
  }
});

/**
 * GET /api/prices/:symbol/history
 * Get historical price data for a currency pair
 */
router.get('/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1H', limit = 100 } = req.query;
    
    let timeFilter = '';
    switch (period) {
      case '1H':
        timeFilter = "datetime('now', '-1 hour')";
        break;
      case '4H':
        timeFilter = "datetime('now', '-4 hours')";
        break;
      case '1D':
        timeFilter = "datetime('now', '-1 day')";
        break;
      case '1W':
        timeFilter = "datetime('now', '-7 days')";
        break;
      default:
        timeFilter = "datetime('now', '-1 hour')";
    }

    const prices = await database.all(`
      SELECT 
        symbol,
        bid_price as bid,
        ask_price as ask,
        mid_price as price,
        timestamp
      FROM price_data 
      WHERE symbol = ? AND timestamp >= ${timeFilter}
      ORDER BY timestamp ASC
      LIMIT ?
    `, [symbol, parseInt(limit)]);

    res.json(prices);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

/**
 * GET /api/prices/:symbol/indicators
 * Get technical indicators for a currency pair
 */
router.get('/:symbol/indicators', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = 20 } = req.query;

    const indicators = await database.all(`
      SELECT 
        indicator_type,
        period,
        value,
        timestamp
      FROM technical_indicators 
      WHERE symbol = ? AND timestamp >= datetime('now', '-1 hour')
      ORDER BY timestamp DESC
    `, [symbol]);

    // Group indicators by type
    const groupedIndicators = {};
    indicators.forEach(indicator => {
      if (!groupedIndicators[indicator.indicator_type]) {
        groupedIndicators[indicator.indicator_type] = [];
      }
      groupedIndicators[indicator.indicator_type].push({
        period: indicator.period,
        value: indicator.value,
        timestamp: indicator.timestamp
      });
    });

    res.json({
      symbol,
      indicators: groupedIndicators,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching indicators:', error);
    res.status(500).json({ error: 'Failed to fetch technical indicators' });
  }
});

/**
 * POST /api/prices/:symbol/analyze
 * Analyze a currency pair using trading algorithms
 */
router.post('/:symbol/analyze', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { algorithms = ['sma', 'rsi', 'bollinger'] } = req.body;

    // Get recent price data for analysis
    const prices = await database.all(`
      SELECT mid_price, timestamp 
      FROM price_data 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `, [symbol]);

    if (prices.length < 20) {
      return res.status(400).json({ error: 'Insufficient price data for analysis' });
    }

    // Add prices to trading algorithms
    prices.reverse().forEach(price => {
      tradingAlgorithms.addPriceData(symbol, price.mid_price, new Date(price.timestamp));
    });

    const analysis = {};

    if (algorithms.includes('sma')) {
      analysis.sma = tradingAlgorithms.smaCrossover(symbol);
    }

    if (algorithms.includes('rsi')) {
      analysis.rsi = tradingAlgorithms.rsiStrategy(symbol);
    }

    if (algorithms.includes('bollinger')) {
      analysis.bollinger = tradingAlgorithms.bollingerBandsStrategy(symbol);
    }

    if (algorithms.includes('combined')) {
      analysis.combined = tradingAlgorithms.combinedStrategy(symbol);
    }

    analysis.indicators = tradingAlgorithms.getIndicators(symbol);
    analysis.timestamp = new Date();

    res.json({
      symbol,
      analysis,
      dataPoints: prices.length
    });
  } catch (error) {
    console.error('Error analyzing symbol:', error);
    res.status(500).json({ error: 'Failed to analyze symbol' });
  }
});

export default router;

