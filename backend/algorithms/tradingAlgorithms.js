import { SMA, EMA, RSI, BollingerBands } from 'technicalindicators';

/**
 * Trading Algorithms for AlphaFxTrader
 * Implements SMA Crossover, RSI, and Bollinger Bands strategies
 */

export class TradingAlgorithms {
  constructor() {
    this.priceHistory = new Map(); // Store price history for each symbol
    this.indicators = new Map(); // Store calculated indicators
  }

  /**
   * Add price data to history
   * @param {string} symbol - Currency pair symbol
   * @param {number} price - Current price
   * @param {Date} timestamp - Price timestamp
   */
  addPriceData(symbol, price, timestamp = new Date()) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const history = this.priceHistory.get(symbol);
    history.push({ price, timestamp });
    
    // Keep only last 200 prices for performance
    if (history.length > 200) {
      history.shift();
    }
  }

  /**
   * Get price history for a symbol
   * @param {string} symbol - Currency pair symbol
   * @param {number} limit - Number of recent prices to return
   * @returns {Array} Price history array
   */
  getPriceHistory(symbol, limit = 50) {
    const history = this.priceHistory.get(symbol) || [];
    return history.slice(-limit);
  }

  /**
   * Simple Moving Average Crossover Strategy
   * @param {string} symbol - Currency pair symbol
   * @param {number} shortPeriod - Short SMA period (default: 10)
   * @param {number} longPeriod - Long SMA period (default: 20)
   * @returns {Object} Trading signal
   */
  smaCrossover(symbol, shortPeriod = 10, longPeriod = 20) {
    const prices = this.getPriceHistory(symbol).map(p => p.price);
    
    if (prices.length < longPeriod) {
      return { signal: 'HOLD', reason: 'Insufficient data' };
    }

    const shortSMA = SMA.calculate({ period: shortPeriod, values: prices });
    const longSMA = SMA.calculate({ period: longPeriod, values: prices });

    if (shortSMA.length < 2 || longSMA.length < 2) {
      return { signal: 'HOLD', reason: 'Insufficient SMA data' };
    }

    const currentShort = shortSMA[shortSMA.length - 1];
    const currentLong = longSMA[longSMA.length - 1];
    const previousShort = shortSMA[shortSMA.length - 2];
    const previousLong = longSMA[longSMA.length - 2];

    // Store indicators for reference
    this.indicators.set(`${symbol}_SMA_SHORT`, currentShort);
    this.indicators.set(`${symbol}_SMA_LONG`, currentLong);

    // Bullish crossover: short SMA crosses above long SMA
    if (previousShort <= previousLong && currentShort > currentLong) {
      return {
        signal: 'BUY',
        reason: 'Bullish SMA crossover',
        shortSMA: currentShort,
        longSMA: currentLong,
        confidence: Math.abs(currentShort - currentLong) / currentLong
      };
    }

    // Bearish crossover: short SMA crosses below long SMA
    if (previousShort >= previousLong && currentShort < currentLong) {
      return {
        signal: 'SELL',
        reason: 'Bearish SMA crossover',
        shortSMA: currentShort,
        longSMA: currentLong,
        confidence: Math.abs(currentShort - currentLong) / currentLong
      };
    }

    return { signal: 'HOLD', reason: 'No crossover detected' };
  }

  /**
   * Relative Strength Index (RSI) Strategy
   * @param {string} symbol - Currency pair symbol
   * @param {number} period - RSI period (default: 14)
   * @param {number} overbought - Overbought threshold (default: 70)
   * @param {number} oversold - Oversold threshold (default: 30)
   * @returns {Object} Trading signal
   */
  rsiStrategy(symbol, period = 14, overbought = 70, oversold = 30) {
    const prices = this.getPriceHistory(symbol).map(p => p.price);
    
    if (prices.length < period + 1) {
      return { signal: 'HOLD', reason: 'Insufficient data for RSI' };
    }

    const rsiValues = RSI.calculate({ period, values: prices });
    
    if (rsiValues.length === 0) {
      return { signal: 'HOLD', reason: 'RSI calculation failed' };
    }

    const currentRSI = rsiValues[rsiValues.length - 1];
    
    // Store RSI for reference
    this.indicators.set(`${symbol}_RSI`, currentRSI);

    if (currentRSI > overbought) {
      return {
        signal: 'SELL',
        reason: 'RSI overbought',
        rsi: currentRSI,
        threshold: overbought,
        confidence: (currentRSI - overbought) / overbought
      };
    }

    if (currentRSI < oversold) {
      return {
        signal: 'BUY',
        reason: 'RSI oversold',
        rsi: currentRSI,
        threshold: oversold,
        confidence: (oversold - currentRSI) / oversold
      };
    }

    return { signal: 'HOLD', reason: 'RSI in neutral zone' };
  }

  /**
   * Bollinger Bands Strategy
   * @param {string} symbol - Currency pair symbol
   * @param {number} period - Bollinger Bands period (default: 20)
   * @param {number} stdDev - Standard deviation multiplier (default: 2)
   * @returns {Object} Trading signal
   */
  bollingerBandsStrategy(symbol, period = 20, stdDev = 2) {
    const prices = this.getPriceHistory(symbol).map(p => p.price);
    
    if (prices.length < period) {
      return { signal: 'HOLD', reason: 'Insufficient data for Bollinger Bands' };
    }

    const bb = BollingerBands.calculate({ 
      period, 
      values: prices, 
      stdDev 
    });
    
    if (bb.length === 0) {
      return { signal: 'HOLD', reason: 'Bollinger Bands calculation failed' };
    }

    const currentBB = bb[bb.length - 1];
    const currentPrice = prices[prices.length - 1];
    
    // Store Bollinger Bands for reference
    this.indicators.set(`${symbol}_BB_UPPER`, currentBB.upper);
    this.indicators.set(`${symbol}_BB_MIDDLE`, currentBB.middle);
    this.indicators.set(`${symbol}_BB_LOWER`, currentBB.lower);

    // Price touches or breaks upper band - potential sell signal
    if (currentPrice >= currentBB.upper) {
      return {
        signal: 'SELL',
        reason: 'Price at upper Bollinger Band',
        price: currentPrice,
        upperBand: currentBB.upper,
        middleBand: currentBB.middle,
        lowerBand: currentBB.lower,
        confidence: (currentPrice - currentBB.upper) / currentBB.upper
      };
    }

    // Price touches or breaks lower band - potential buy signal
    if (currentPrice <= currentBB.lower) {
      return {
        signal: 'BUY',
        reason: 'Price at lower Bollinger Band',
        price: currentPrice,
        upperBand: currentBB.upper,
        middleBand: currentBB.middle,
        lowerBand: currentBB.lower,
        confidence: (currentBB.lower - currentPrice) / currentBB.lower
      };
    }

    return { signal: 'HOLD', reason: 'Price within Bollinger Bands' };
  }

  /**
   * Combined Strategy - Uses multiple algorithms for better accuracy
   * @param {string} symbol - Currency pair symbol
   * @returns {Object} Combined trading signal
   */
  combinedStrategy(symbol) {
    const smaSignal = this.smaCrossover(symbol);
    const rsiSignal = this.rsiStrategy(symbol);
    const bbSignal = this.bollingerBandsStrategy(symbol);

    const signals = [smaSignal, rsiSignal, bbSignal];
    const buySignals = signals.filter(s => s.signal === 'BUY').length;
    const sellSignals = signals.filter(s => s.signal === 'SELL').length;

    let finalSignal = 'HOLD';
    let confidence = 0;
    let reasons = [];

    if (buySignals >= 2) {
      finalSignal = 'BUY';
      confidence = buySignals / 3;
      reasons = signals.filter(s => s.signal === 'BUY').map(s => s.reason);
    } else if (sellSignals >= 2) {
      finalSignal = 'SELL';
      confidence = sellSignals / 3;
      reasons = signals.filter(s => s.signal === 'SELL').map(s => s.reason);
    }

    return {
      signal: finalSignal,
      confidence,
      reasons,
      individualSignals: {
        sma: smaSignal,
        rsi: rsiSignal,
        bollinger: bbSignal
      }
    };
  }

  /**
   * Get all calculated indicators for a symbol
   * @param {string} symbol - Currency pair symbol
   * @returns {Object} All indicators
   */
  getIndicators(symbol) {
    const indicators = {};
    const keys = Array.from(this.indicators.keys()).filter(key => key.startsWith(symbol));
    
    keys.forEach(key => {
      const indicatorName = key.replace(`${symbol}_`, '');
      indicators[indicatorName] = this.indicators.get(key);
    });

    return indicators;
  }

  /**
   * Calculate performance metrics for backtesting
   * @param {Array} trades - Array of trade objects
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics(trades) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalReturn: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const totalReturn = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    const winRate = (winningTrades.length / trades.length) * 100;
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    // Calculate Sharpe Ratio (simplified)
    const returns = trades.map(t => t.pnl);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const sharpeRatio = Math.sqrt(variance) > 0 ? avgReturn / Math.sqrt(variance) : 0;

    // Calculate Max Drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningTotal = 0;
    
    trades.forEach(trade => {
      runningTotal += trade.pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      averageWin: parseFloat(averageWin.toFixed(2)),
      averageLoss: parseFloat(averageLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2))
    };
  }
}

export default TradingAlgorithms;

