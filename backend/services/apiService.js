import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * External API Service for Forex Data
 * Integrates with Exchange Rate API and other data sources
 */

class APIService {
  constructor() {
    this.exchangeRateAPIKey = process.env.EXCHANGE_RATE_API_KEY;
    this.exchangeRateBaseURL = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    this.requestTimeout = 10000; // 10 seconds
    
    // Rate limiting
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.maxRequestsPerMinute = 60;
  }

  /**
   * Check if we can make a request (rate limiting)
   * @returns {boolean} True if request is allowed
   */
  canMakeRequest() {
    const now = Date.now();
    const timeDiff = now - this.lastResetTime;
    
    // Reset counter every minute
    if (timeDiff >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    return this.requestCount < this.maxRequestsPerMinute;
  }

  /**
   * Make HTTP request with error handling and rate limiting
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise} API response
   */
  async makeRequest(url, options = {}) {
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
      this.requestCount++;
      
      const response = await axios({
        url,
        timeout: this.requestTimeout,
        headers: {
          'User-Agent': 'AlphaFxTrader/1.0',
          ...options.headers
        },
        ...options
      });

      return response.data;
    } catch (error) {
      console.error('API request failed:', error.message);
      
      if (error.response) {
        // Server responded with error status
        throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('No response from API server');
      } else {
        // Something else happened
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  /**
   * Get current exchange rates for major currency pairs
   * @returns {Promise<Array>} Array of currency pair data
   */
  async getCurrentRates() {
    try {
      // For demo purposes, use mock data instead of external API
      return this.getMockRates();
      
      // Uncomment below for real API integration
      /*
      const data = await this.makeRequest(this.exchangeRateBaseURL);
      
      if (!data.rates) {
        throw new Error('Invalid response format from exchange rate API');
      }

      // Convert to our format
      const currencyPairs = [
        'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'
      ];

      const baseCurrency = data.base || 'USD';
      const rates = data.rates;
      const timestamp = new Date(data.date || Date.now());

      const result = [];

      // Create major pairs
      const majorPairs = [
        { symbol: 'EUR/USD', base: 'EUR', quote: 'USD' },
        { symbol: 'GBP/USD', base: 'GBP', quote: 'USD' },
        { symbol: 'USD/JPY', base: 'USD', quote: 'JPY' },
        { symbol: 'AUD/USD', base: 'AUD', quote: 'USD' },
        { symbol: 'USD/CAD', base: 'USD', quote: 'CAD' },
        { symbol: 'USD/CHF', base: 'USD', quote: 'CHF' },
        { symbol: 'NZD/USD', base: 'NZD', quote: 'USD' },
        { symbol: 'EUR/GBP', base: 'EUR', quote: 'GBP' }
      ];

      for (const pair of majorPairs) {
        try {
          let rate;
          
          if (pair.base === baseCurrency) {
            // Direct rate
            rate = rates[pair.quote] || 1;
          } else if (pair.quote === baseCurrency) {
            // Inverse rate
            rate = 1 / (rates[pair.base] || 1);
          } else {
            // Cross rate
            const baseToUSD = rates[pair.base] || 1;
            const quoteToUSD = rates[pair.quote] || 1;
            rate = baseToUSD / quoteToUSD;
          }

          // Add spread (simulate bid/ask)
          const spread = 0.0002; // 2 pips for major pairs
          const bid = rate - spread / 2;
          const ask = rate + spread / 2;

          result.push({
            symbol: pair.symbol,
            bid: parseFloat(bid.toFixed(5)),
            ask: parseFloat(ask.toFixed(5)),
            price: parseFloat(rate.toFixed(5)),
            timestamp,
            source: 'exchange-rate-api'
          });
        } catch (error) {
          console.warn(`Failed to get rate for ${pair.symbol}:`, error.message);
        }
      }

      return result;
      */
    } catch (error) {
      console.error('Failed to get current rates:', error.message);
      // Fallback to mock data
      return this.getMockRates();
    }
  }

  /**
   * Get mock exchange rates for demo purposes
   * @returns {Array} Array of mock currency pair data
   */
  getMockRates() {
    const timestamp = new Date();
    const basePrices = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 149.50,
      'AUD/USD': 0.6580,
      'USD/CAD': 1.3650,
      'USD/CHF': 0.8750,
      'NZD/USD': 0.6120,
      'EUR/GBP': 0.8580
    };

    const result = [];

    for (const [symbol, basePrice] of Object.entries(basePrices)) {
      // Add some random fluctuation
      const fluctuation = (Math.random() - 0.5) * 0.001; // 0.1% max change
      const currentPrice = basePrice * (1 + fluctuation);
      
      // Add spread
      const spread = 0.0002; // 2 pips for major pairs
      const bid = currentPrice - spread / 2;
      const ask = currentPrice + spread / 2;

      result.push({
        symbol,
        bid: parseFloat(bid.toFixed(5)),
        ask: parseFloat(ask.toFixed(5)),
        price: parseFloat(currentPrice.toFixed(5)),
        timestamp,
        source: 'mock-data'
      });
    }

    return result;
  }

  /**
   * Get historical rates for a currency pair
   * @param {string} symbol - Currency pair symbol
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Historical rate data
   */
  async getHistoricalRates(symbol, startDate, endDate) {
    try {
      // For demo purposes, we'll simulate historical data
      // In production, you would use a proper historical data API
      const [base, quote] = symbol.split('/');
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      const historicalData = [];
      let currentDate = new Date(startDate);
      
      // Simulate price movement
      let basePrice = 1.0;
      if (symbol === 'EUR/USD') basePrice = 1.0850;
      else if (symbol === 'GBP/USD') basePrice = 1.2650;
      else if (symbol === 'USD/JPY') basePrice = 149.50;
      else if (symbol === 'AUD/USD') basePrice = 0.6580;
      else if (symbol === 'USD/CAD') basePrice = 1.3650;

      for (let i = 0; i < daysDiff; i++) {
        // Simulate random walk with slight upward bias
        const change = (Math.random() - 0.5) * 0.01; // 1% max change
        basePrice *= (1 + change);
        
        const spread = 0.0002;
        const bid = basePrice - spread / 2;
        const ask = basePrice + spread / 2;

        historicalData.push({
          symbol,
          bid: parseFloat(bid.toFixed(5)),
          ask: parseFloat(ask.toFixed(5)),
          price: parseFloat(basePrice.toFixed(5)),
          timestamp: new Date(currentDate),
          volume: Math.floor(Math.random() * 1000000) + 100000
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return historicalData;
    } catch (error) {
      console.error('Failed to get historical rates:', error.message);
      throw error;
    }
  }

  /**
   * Get market news and events
   * @returns {Promise<Array>} Market news
   */
  async getMarketNews() {
    try {
      // Simulate market news
      const news = [
        {
          id: 1,
          title: 'Federal Reserve Maintains Interest Rates',
          summary: 'The Fed kept rates unchanged at 5.25-5.50% as expected.',
          impact: 'medium',
          currency: 'USD',
          timestamp: new Date(Date.now() - 3600000) // 1 hour ago
        },
        {
          id: 2,
          title: 'ECB Signals Potential Rate Cut',
          summary: 'European Central Bank hints at possible rate reduction in Q2.',
          impact: 'high',
          currency: 'EUR',
          timestamp: new Date(Date.now() - 7200000) // 2 hours ago
        },
        {
          id: 3,
          title: 'UK Inflation Data Shows Improvement',
          summary: 'UK inflation fell to 3.2% in December, below expectations.',
          impact: 'medium',
          currency: 'GBP',
          timestamp: new Date(Date.now() - 10800000) // 3 hours ago
        }
      ];

      return news;
    } catch (error) {
      console.error('Failed to get market news:', error.message);
      return [];
    }
  }

  /**
   * Get economic calendar events
   * @param {Date} date - Date to get events for
   * @returns {Promise<Array>} Economic calendar events
   */
  async getEconomicCalendar(date = new Date()) {
    try {
      // Simulate economic calendar
      const events = [
        {
          id: 1,
          title: 'Non-Farm Payrolls',
          country: 'US',
          currency: 'USD',
          impact: 'high',
          time: new Date(date.getTime() + 3600000), // 1 hour from now
          forecast: '200K',
          previous: '199K'
        },
        {
          id: 2,
          title: 'GDP Growth Rate',
          country: 'EU',
          currency: 'EUR',
          impact: 'medium',
          time: new Date(date.getTime() + 7200000), // 2 hours from now
          forecast: '0.3%',
          previous: '0.2%'
        }
      ];

      return events;
    } catch (error) {
      console.error('Failed to get economic calendar:', error.message);
      return [];
    }
  }

  /**
   * Health check for API connectivity
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.makeRequest(this.exchangeRateBaseURL);
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        rateLimitRemaining: this.maxRequestsPerMinute - this.requestCount
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date(),
        rateLimitRemaining: this.maxRequestsPerMinute - this.requestCount
      };
    }
  }
}

export default APIService;
