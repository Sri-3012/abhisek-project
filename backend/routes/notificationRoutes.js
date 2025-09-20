import express from 'express';
import database from '../database/database.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications with filtering options
 */
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      isRead, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type.toUpperCase());
    }

    if (isRead !== undefined) {
      whereClause += ' AND is_read = ?';
      params.push(isRead === 'true' ? 1 : 0);
    }

    const notifications = await database.all(`
      SELECT 
        id,
        type,
        title,
        message,
        symbol,
        is_read,
        created_at
      FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count for pagination
    const countResult = await database.get(`
      SELECT COUNT(*) as total 
      FROM notifications 
      ${whereClause}
    `, params);

    res.json({
      notifications,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: countResult.total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req, res) => {
  try {
    const result = await database.get(`
      SELECT COUNT(*) as unread_count 
      FROM notifications 
      WHERE is_read = 0
    `);

    res.json({
      unreadCount: result.unread_count,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.run(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE id = ?
    `, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', async (req, res) => {
  try {
    const result = await database.run(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE is_read = 0
    `);

    res.json({ 
      message: 'All notifications marked as read',
      updatedCount: result.changes
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.run(`
      DELETE FROM notifications 
      WHERE id = ?
    `, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * POST /api/notifications
 * Create a new notification
 */
router.post('/', async (req, res) => {
  try {
    const { type, title, message, symbol } = req.body;

    // Validate input
    if (!type || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, title, message' 
      });
    }

    const validTypes = ['PRICE_ALERT', 'TRADE_EXECUTED', 'SYSTEM', 'RISK_MANAGEMENT'];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ 
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    const result = await database.run(`
      INSERT INTO notifications (type, title, message, symbol, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `, [type.toUpperCase(), title, message, symbol || null, new Date()]);

    const notification = await database.get(`
      SELECT * FROM notifications WHERE id = ?
    `, [result.lastID]);

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get('/stats', async (req, res) => {
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
        COUNT(*) as total_notifications,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_notifications,
        SUM(CASE WHEN type = 'PRICE_ALERT' THEN 1 ELSE 0 END) as price_alerts,
        SUM(CASE WHEN type = 'TRADE_EXECUTED' THEN 1 ELSE 0 END) as trade_notifications,
        SUM(CASE WHEN type = 'SYSTEM' THEN 1 ELSE 0 END) as system_notifications,
        SUM(CASE WHEN type = 'RISK_MANAGEMENT' THEN 1 ELSE 0 END) as risk_notifications
      FROM notifications 
      WHERE created_at >= ${timeFilter}
    `);

    res.json({
      period,
      totalNotifications: stats.total_notifications || 0,
      unreadNotifications: stats.unread_notifications || 0,
      byType: {
        priceAlerts: stats.price_alerts || 0,
        tradeNotifications: stats.trade_notifications || 0,
        systemNotifications: stats.system_notifications || 0,
        riskNotifications: stats.risk_notifications || 0
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

export default router;

