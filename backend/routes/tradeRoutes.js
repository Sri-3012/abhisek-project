import express from 'express';
import database from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/trades
 * Get trade history with filtering options
 */
router.get('/', async (req, res) => {
  try {
    const { 
      symbol, 
      action, 
      status, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (symbol) {
      whereClause += ' AND symbol = ?';
      params.push(symbol);
    }

    if (action) {
      whereClause += ' AND action = ?';
      params.push(action.toUpperCase());
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status.toUpperCase());
    }

    if (startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(endDate);
    }

    const trades = await database.all(`
      SELECT 
        id,
        symbol,
        action,
        quantity,
        price,
        status,
        algorithm_used,
        pnl,
        created_at,
        filled_at
      FROM trades 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count for pagination
    const countResult = await database.get(`
      SELECT COUNT(*) as total 
      FROM trades 
      ${whereClause}
    `, params);

    res.json({
      trades,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: countResult.total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

/**
 * GET /api/trades/:id
 * Get a specific trade by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const trade = await database.get(`
      SELECT 
        id,
        symbol,
        action,
        quantity,
        price,
        status,
        algorithm_used,
        pnl,
        created_at,
        filled_at
      FROM trades 
      WHERE id = ?
    `, [id]);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    console.error('Error fetching trade:', error);
    res.status(500).json({ error: 'Failed to fetch trade' });
  }
});

/**
 * POST /api/trades
 * Execute a new trade
 */
router.post('/', async (req, res) => {
  try {
    const { symbol, action, quantity, algorithm } = req.body;

    // Validate input
    if (!symbol || !action || !quantity) {
      return res.status(400).json({ 
        error: 'Missing required fields: symbol, action, quantity' 
      });
    }

    if (!['BUY', 'SELL'].includes(action.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Action must be either BUY or SELL' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ 
        error: 'Quantity must be greater than 0' 
      });
    }

    // Get current price
    const priceData = await database.get(`
      SELECT bid_price, ask_price, mid_price 
      FROM price_data 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [symbol]);

    if (!priceData) {
      return res.status(400).json({ 
        error: `No price data available for ${symbol}` 
      });
    }

    // Determine trade price based on action
    const tradePrice = action.toUpperCase() === 'BUY' 
      ? priceData.ask_price 
      : priceData.bid_price;

    const tradeId = uuidv4();
    const now = new Date();

    // Create trade record
    const trade = {
      id: tradeId,
      symbol,
      action: action.toUpperCase(),
      quantity: parseInt(quantity),
      price: tradePrice,
      status: 'FILLED',
      algorithm_used: algorithm || 'MANUAL',
      pnl: 0, // Will be calculated later
      created_at: now,
      filled_at: now
    };

    // Store trade in database
    await database.run(`
      INSERT INTO trades (
        id, symbol, action, quantity, price, status, 
        algorithm_used, pnl, created_at, filled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      trade.id, trade.symbol, trade.action, trade.quantity, 
      trade.price, trade.status, trade.algorithm_used, 
      trade.pnl, trade.created_at, trade.filled_at
    ]);

    // Create notification
    await database.run(`
      INSERT INTO notifications (type, title, message, symbol, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      'TRADE_EXECUTED',
      'Trade Executed',
      `${trade.action} ${trade.quantity.toLocaleString()} ${trade.symbol} at ${trade.price}`,
      trade.symbol,
      now
    ]);

    res.status(201).json(trade);
  } catch (error) {
    console.error('Error executing trade:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

/**
 * PUT /api/trades/:id
 * Update trade status (e.g., cancel trade)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, pnl } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'FILLED', 'CANCELLED', 'REJECTED'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    let updateClause = '';
    const params = [];

    if (status) {
      updateClause += 'status = ?';
      params.push(status.toUpperCase());
    }

    if (pnl !== undefined) {
      if (updateClause) updateClause += ', ';
      updateClause += 'pnl = ?';
      params.push(pnl);
    }

    if (!updateClause) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const result = await database.run(`
      UPDATE trades 
      SET ${updateClause}
      WHERE id = ?
    `, params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Get updated trade
    const updatedTrade = await database.get(`
      SELECT * FROM trades WHERE id = ?
    `, [id]);

    res.json(updatedTrade);
  } catch (error) {
    console.error('Error updating trade:', error);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

/**
 * DELETE /api/trades/:id
 * Cancel a pending trade
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if trade exists and is pending
    const trade = await database.get(`
      SELECT * FROM trades WHERE id = ? AND status = 'PENDING'
    `, [id]);

    if (!trade) {
      return res.status(404).json({ 
        error: 'Trade not found or cannot be cancelled' 
      });
    }

    // Update trade status to cancelled
    await database.run(`
      UPDATE trades 
      SET status = 'CANCELLED' 
      WHERE id = ?
    `, [id]);

    // Create notification
    await database.run(`
      INSERT INTO notifications (type, title, message, symbol, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      'TRADE_CANCELLED',
      'Trade Cancelled',
      `Trade ${id} has been cancelled`,
      trade.symbol,
      new Date()
    ]);

    res.json({ message: 'Trade cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling trade:', error);
    res.status(500).json({ error: 'Failed to cancel trade' });
  }
});

/**
 * GET /api/trades/stats/summary
 * Get trading statistics summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { period = '1D' } = req.query;

    let timeFilter = '';
    switch (period) {
      case '1H':
        timeFilter = "datetime('now', '-1 hour')";
        break;
      case '1D':
        timeFilter = "datetime('now', '-1 day')";
        break;
      case '1W':
        timeFilter = "datetime('now', '-7 days')";
        break;
      case '1M':
        timeFilter = "datetime('now', '-30 days')";
        break;
      default:
        timeFilter = "datetime('now', '-1 day')";
    }

    const stats = await database.get(`
      SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN action = 'BUY' THEN 1 ELSE 0 END) as buy_trades,
        SUM(CASE WHEN action = 'SELL' THEN 1 ELSE 0 END) as sell_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(quantity * price) as total_volume,
        SUM(pnl) as total_pnl,
        AVG(pnl) as average_pnl,
        MAX(pnl) as max_profit,
        MIN(pnl) as max_loss
      FROM trades 
      WHERE created_at >= ${timeFilter} AND status = 'FILLED'
    `);

    // Calculate win rate
    const winRate = stats.total_trades > 0 
      ? (stats.winning_trades / stats.total_trades) * 100 
      : 0;

    res.json({
      period,
      totalTrades: stats.total_trades || 0,
      buyTrades: stats.buy_trades || 0,
      sellTrades: stats.sell_trades || 0,
      winningTrades: stats.winning_trades || 0,
      losingTrades: stats.losing_trades || 0,
      winRate: parseFloat(winRate.toFixed(2)),
      totalVolume: stats.total_volume || 0,
      totalPnl: stats.total_pnl || 0,
      averagePnl: stats.average_pnl || 0,
      maxProfit: stats.max_profit || 0,
      maxLoss: stats.max_loss || 0
    });
  } catch (error) {
    console.error('Error fetching trade stats:', error);
    res.status(500).json({ error: 'Failed to fetch trade statistics' });
  }
});

/**
 * GET /api/trades/stats/by-symbol
 * Get trading statistics by currency pair
 */
router.get('/stats/by-symbol', async (req, res) => {
  try {
    const { period = '1D' } = req.query;

    let timeFilter = '';
    switch (period) {
      case '1H':
        timeFilter = "datetime('now', '-1 hour')";
        break;
      case '1D':
        timeFilter = "datetime('now', '-1 day')";
        break;
      case '1W':
        timeFilter = "datetime('now', '-7 days')";
        break;
      case '1M':
        timeFilter = "datetime('now', '-30 days')";
        break;
      default:
        timeFilter = "datetime('now', '-1 day')";
    }

    const stats = await database.all(`
      SELECT 
        symbol,
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(pnl) as total_pnl,
        SUM(quantity * price) as total_volume,
        AVG(pnl) as average_pnl
      FROM trades 
      WHERE created_at >= ${timeFilter} AND status = 'FILLED'
      GROUP BY symbol
      ORDER BY total_pnl DESC
    `);

    const result = stats.map(stat => ({
      symbol: stat.symbol,
      totalTrades: stat.total_trades,
      winningTrades: stat.winning_trades,
      winRate: stat.total_trades > 0 
        ? parseFloat(((stat.winning_trades / stat.total_trades) * 100).toFixed(2))
        : 0,
      totalPnl: stat.total_pnl,
      totalVolume: stat.total_volume,
      averagePnl: stat.average_pnl
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching trade stats by symbol:', error);
    res.status(500).json({ error: 'Failed to fetch trade statistics by symbol' });
  }
});

export default router;

