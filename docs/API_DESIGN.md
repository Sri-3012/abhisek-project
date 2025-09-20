# AlphaFxTrader - API Design Document

## Overview

The AlphaFxTrader API provides a comprehensive RESTful interface for forex trading operations, real-time data streaming, and algorithmic trading management. The API is built using Express.js and follows REST principles with WebSocket support for real-time features.

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.alphafxtrader.com/api
```

## Authentication

Currently, the API operates without authentication for demo purposes. In production, implement JWT-based authentication:

```http
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 1. Health Check

#### GET /health
Check system health and status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "status": "healthy",
    "responseTime": 5
  },
  "api": {
    "status": "healthy",
    "responseTime": 120,
    "rateLimitRemaining": 58
  },
  "trading": {
    "autoTrading": true,
    "currentVolume": 1500000,
    "maxVolume": 10000000,
    "sessionActive": true
  }
}
```

### 2. Price Data Endpoints

#### GET /api/prices
Get current prices for all currency pairs.

**Query Parameters:**
- `limit` (optional): Number of results (default: 100)
- `symbol` (optional): Filter by specific currency pair

**Response:**
```json
[
  {
    "symbol": "EUR/USD",
    "bid": 1.0848,
    "ask": 1.0852,
    "price": 1.0850,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "sma": 1.0845,
    "ema": 1.0847,
    "rsi": 65.2,
    "bollinger": {
      "upper": 1.0865,
      "middle": 1.0845,
      "lower": 1.0825
    }
  }
]
```

#### GET /api/prices/:symbol
Get current price for a specific currency pair.

**Path Parameters:**
- `symbol`: Currency pair symbol (e.g., "EUR/USD")

**Response:**
```json
{
  "symbol": "EUR/USD",
  "bid": 1.0848,
  "ask": 1.0852,
  "price": 1.0850,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sma": 1.0845,
  "ema": 1.0847,
  "rsi": 65.2
}
```

#### GET /api/prices/:symbol/history
Get historical price data for a currency pair.

**Path Parameters:**
- `symbol`: Currency pair symbol

**Query Parameters:**
- `period` (optional): Time period ("1H", "4H", "1D", "1W")
- `limit` (optional): Number of records (default: 100)

**Response:**
```json
[
  {
    "symbol": "EUR/USD",
    "bid": 1.0848,
    "ask": 1.0852,
    "price": 1.0850,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
]
```

#### GET /api/prices/:symbol/indicators
Get technical indicators for a currency pair.

**Path Parameters:**
- `symbol`: Currency pair symbol

**Query Parameters:**
- `period` (optional): Indicator period (default: 20)

**Response:**
```json
{
  "symbol": "EUR/USD",
  "indicators": {
    "SMA": [
      {
        "period": 20,
        "value": 1.0845,
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "RSI": [
      {
        "period": 14,
        "value": 65.2,
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### POST /api/prices/:symbol/analyze
Analyze a currency pair using trading algorithms.

**Path Parameters:**
- `symbol`: Currency pair symbol

**Request Body:**
```json
{
  "algorithms": ["sma", "rsi", "bollinger", "combined"]
}
```

**Response:**
```json
{
  "symbol": "EUR/USD",
  "analysis": {
    "sma": {
      "signal": "BUY",
      "reason": "Bullish SMA crossover",
      "shortSMA": 1.0847,
      "longSMA": 1.0845,
      "confidence": 0.75
    },
    "rsi": {
      "signal": "HOLD",
      "reason": "RSI in neutral zone",
      "rsi": 65.2,
      "threshold": 70
    },
    "combined": {
      "signal": "BUY",
      "confidence": 0.67,
      "reasons": ["Bullish SMA crossover", "Price at lower Bollinger Band"]
    }
  },
  "indicators": {
    "SMA_SHORT": 1.0847,
    "SMA_LONG": 1.0845,
    "RSI": 65.2
  },
  "dataPoints": 50,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Trade Management Endpoints

#### GET /api/trades
Get trade history with filtering options.

**Query Parameters:**
- `symbol` (optional): Filter by currency pair
- `action` (optional): Filter by action ("BUY", "SELL")
- `status` (optional): Filter by status ("PENDING", "FILLED", "CANCELLED")
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "trades": [
    {
      "id": "T1705312200000123",
      "symbol": "EUR/USD",
      "action": "BUY",
      "quantity": 10000,
      "price": 1.0850,
      "status": "FILLED",
      "algorithm_used": "SMA_CROSSOVER",
      "pnl": 25.50,
      "created_at": "2024-01-15T10:30:00.000Z",
      "filled_at": "2024-01-15T10:30:01.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

#### GET /api/trades/:id
Get a specific trade by ID.

**Path Parameters:**
- `id`: Trade ID

**Response:**
```json
{
  "id": "T1705312200000123",
  "symbol": "EUR/USD",
  "action": "BUY",
  "quantity": 10000,
  "price": 1.0850,
  "status": "FILLED",
  "algorithm_used": "SMA_CROSSOVER",
  "pnl": 25.50,
  "created_at": "2024-01-15T10:30:00.000Z",
  "filled_at": "2024-01-15T10:30:01.000Z"
}
```

#### POST /api/trades
Execute a new trade.

**Request Body:**
```json
{
  "symbol": "EUR/USD",
  "action": "BUY",
  "quantity": 10000,
  "algorithm": "MANUAL"
}
```

**Response:**
```json
{
  "id": "T1705312200000123",
  "symbol": "EUR/USD",
  "action": "BUY",
  "quantity": 10000,
  "price": 1.0850,
  "status": "FILLED",
  "algorithm_used": "MANUAL",
  "pnl": 0,
  "created_at": "2024-01-15T10:30:00.000Z",
  "filled_at": "2024-01-15T10:30:00.000Z"
}
```

#### PUT /api/trades/:id
Update trade status.

**Path Parameters:**
- `id`: Trade ID

**Request Body:**
```json
{
  "status": "CANCELLED",
  "pnl": -15.25
}
```

**Response:**
```json
{
  "id": "T1705312200000123",
  "symbol": "EUR/USD",
  "action": "BUY",
  "quantity": 10000,
  "price": 1.0850,
  "status": "CANCELLED",
  "algorithm_used": "MANUAL",
  "pnl": -15.25,
  "created_at": "2024-01-15T10:30:00.000Z",
  "filled_at": "2024-01-15T10:30:01.000Z"
}
```

#### DELETE /api/trades/:id
Cancel a pending trade.

**Path Parameters:**
- `id`: Trade ID

**Response:**
```json
{
  "message": "Trade cancelled successfully"
}
```

#### GET /api/trades/stats/summary
Get trading statistics summary.

**Query Parameters:**
- `period` (optional): Time period ("1H", "1D", "1W", "1M")

**Response:**
```json
{
  "period": "1D",
  "totalTrades": 25,
  "buyTrades": 15,
  "sellTrades": 10,
  "winningTrades": 18,
  "losingTrades": 7,
  "winRate": 72.0,
  "totalVolume": 250000,
  "totalPnl": 1250.75,
  "averagePnl": 50.03,
  "maxProfit": 150.25,
  "maxLoss": -75.50
}
```

#### GET /api/trades/stats/by-symbol
Get trading statistics by currency pair.

**Query Parameters:**
- `period` (optional): Time period ("1H", "1D", "1W", "1M")

**Response:**
```json
[
  {
    "symbol": "EUR/USD",
    "totalTrades": 15,
    "winningTrades": 11,
    "winRate": 73.33,
    "totalPnl": 850.25,
    "totalVolume": 150000,
    "averagePnl": 56.68
  }
]
```

### 4. Algorithm Endpoints

#### GET /api/algorithms/performance
Get performance metrics for all trading algorithms.

**Query Parameters:**
- `period` (optional): Time period ("1D", "1W", "1M", "3M")

**Response:**
```json
{
  "period": "1M",
  "algorithms": [
    {
      "algorithm": "SMA_CROSSOVER",
      "totalTrades": 45,
      "winningTrades": 28,
      "losingTrades": 17,
      "winRate": 62.22,
      "totalPnl": 1250.75,
      "averagePnl": 27.79,
      "maxProfit": 150.25,
      "maxLoss": -75.50,
      "totalVolume": 450000,
      "profitFactor": 1.99
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/algorithms/backtest
Get backtest results for trading algorithms.

**Query Parameters:**
- `algorithm` (optional): Filter by algorithm name
- `symbol` (optional): Filter by currency pair
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**
```json
[
  {
    "algorithm_name": "SMA_CROSSOVER",
    "symbol": "EUR/USD",
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": "2024-01-31T23:59:59.000Z",
    "initial_capital": 10000,
    "final_capital": 11250.75,
    "total_return": 12.51,
    "sharpe_ratio": 1.85,
    "max_drawdown": 5.25,
    "total_trades": 45,
    "win_rate": 62.22,
    "parameters": "{\"shortPeriod\":10,\"longPeriod\":20}",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

#### POST /api/algorithms/backtest
Run a new backtest for a trading algorithm.

**Request Body:**
```json
{
  "algorithm": "SMA_CROSSOVER",
  "symbol": "EUR/USD",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T23:59:59.000Z",
  "initialCapital": 10000,
  "parameters": {
    "shortPeriod": 10,
    "longPeriod": 20
  }
}
```

**Response:**
```json
{
  "id": 123,
  "algorithm": "SMA_CROSSOVER",
  "symbol": "EUR/USD",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T23:59:59.000Z",
  "initialCapital": 10000,
  "finalCapital": 11250.75,
  "totalReturn": 12.51,
  "totalTrades": 45,
  "winningTrades": 28,
  "winRate": 62.22,
  "sharpeRatio": 1.85,
  "maxDrawdown": 5.25,
  "parameters": {
    "shortPeriod": 10,
    "longPeriod": 20
  }
}
```

#### GET /api/algorithms/signals
Get current trading signals for all symbols.

**Response:**
```json
{
  "signals": {
    "EUR/USD": {
      "sma": {
        "signal": "BUY",
        "reason": "Bullish SMA crossover",
        "confidence": 0.75
      },
      "rsi": {
        "signal": "HOLD",
        "reason": "RSI in neutral zone"
      },
      "combined": {
        "signal": "BUY",
        "confidence": 0.67,
        "reasons": ["Bullish SMA crossover"]
      }
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/algorithms/signals/:symbol
Get trading signals for a specific symbol.

**Path Parameters:**
- `symbol`: Currency pair symbol

**Query Parameters:**
- `algorithms` (optional): Comma-separated list of algorithms

**Response:**
```json
{
  "symbol": "EUR/USD",
  "signals": {
    "sma": {
      "signal": "BUY",
      "reason": "Bullish SMA crossover",
      "confidence": 0.75
    },
    "combined": {
      "signal": "BUY",
      "confidence": 0.67,
      "reasons": ["Bullish SMA crossover"]
    }
  },
  "indicators": {
    "SMA_SHORT": 1.0847,
    "SMA_LONG": 1.0845,
    "RSI": 65.2
  },
  "dataPoints": 50,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Notification Endpoints

#### GET /api/notifications
Get notifications with filtering options.

**Query Parameters:**
- `type` (optional): Filter by notification type
- `isRead` (optional): Filter by read status
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "TRADE_EXECUTED",
      "title": "Trade Executed",
      "message": "BUY 10,000 EUR/USD at 1.0850",
      "symbol": "EUR/USD",
      "is_read": false,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### GET /api/notifications/unread-count
Get count of unread notifications.

**Response:**
```json
{
  "unreadCount": 5,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### PUT /api/notifications/:id/read
Mark a notification as read.

**Path Parameters:**
- `id`: Notification ID

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

#### PUT /api/notifications/read-all
Mark all notifications as read.

**Response:**
```json
{
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

#### DELETE /api/notifications/:id
Delete a notification.

**Path Parameters:**
- `id`: Notification ID

**Response:**
```json
{
  "message": "Notification deleted successfully"
}
```

#### POST /api/notifications
Create a new notification.

**Request Body:**
```json
{
  "type": "PRICE_ALERT",
  "title": "Price Alert",
  "message": "EUR/USD crossed above 1.0900",
  "symbol": "EUR/USD"
}
```

**Response:**
```json
{
  "id": 26,
  "type": "PRICE_ALERT",
  "title": "Price Alert",
  "message": "EUR/USD crossed above 1.0900",
  "symbol": "EUR/USD",
  "is_read": false,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/notifications/stats
Get notification statistics.

**Query Parameters:**
- `period` (optional): Time period ("1H", "1D", "1W", "1M")

**Response:**
```json
{
  "period": "1D",
  "totalNotifications": 25,
  "unreadNotifications": 5,
  "byType": {
    "priceAlerts": 10,
    "tradeNotifications": 12,
    "systemNotifications": 2,
    "riskNotifications": 1
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## WebSocket API

### Connection

```javascript
const socket = io('http://localhost:3001');
```

### Events

#### Client → Server Events

##### execute_trade
Execute a trade via WebSocket.

```javascript
socket.emit('execute_trade', {
  symbol: 'EUR/USD',
  action: 'BUY',
  quantity: 10000,
  algorithm: 'MANUAL'
});
```

##### analyze_symbol
Request algorithm analysis for a symbol.

```javascript
socket.emit('analyze_symbol', 'EUR/USD');
```

#### Server → Client Events

##### price_update
Real-time price updates.

```javascript
socket.on('price_update', (data) => {
  console.log('Price update:', data);
  // data.prices contains array of price objects
});
```

##### trade_executed
Trade execution confirmation.

```javascript
socket.on('trade_executed', (trade) => {
  console.log('Trade executed:', trade);
});
```

##### trade_update
Trade status updates.

```javascript
socket.on('trade_update', (data) => {
  console.log('Trade update:', data.trade);
});
```

##### notification
New notification.

```javascript
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

##### trading_session_update
Trading session updates.

```javascript
socket.on('trading_session_update', (session) => {
  console.log('Trading session:', session);
});
```

##### analysis_result
Algorithm analysis result.

```javascript
socket.on('analysis_result', (data) => {
  console.log('Analysis for', data.symbol, ':', data.analysis);
});
```

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": {
    "field": "Additional error details"
  }
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Error Codes

- `INVALID_SYMBOL`: Invalid currency pair symbol
- `INSUFFICIENT_DATA`: Not enough data for operation
- `TRADE_VALIDATION_FAILED`: Trade validation error
- `ALGORITHM_NOT_FOUND`: Algorithm not found
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `DATABASE_ERROR`: Database operation failed

## Rate Limiting

### Limits

- **Price Data**: 100 requests per minute
- **Trade Execution**: 10 requests per minute
- **Algorithm Analysis**: 20 requests per minute
- **General API**: 1000 requests per hour

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Pagination

### Query Parameters

- `limit`: Number of items per page (default: 100, max: 1000)
- `offset`: Number of items to skip (default: 0)

### Response Format

```json
{
  "data": [...],
  "pagination": {
    "total": 1500,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

## Data Formats

### Timestamps

All timestamps are in ISO 8601 format with UTC timezone:
```
2024-01-15T10:30:00.000Z
```

### Currency Pairs

Currency pairs use standard ISO format:
- `EUR/USD`
- `GBP/USD`
- `USD/JPY`

### Price Precision

Prices are returned with 5 decimal places for major pairs:
```json
{
  "price": 1.08500
}
```

### Trade Quantities

Quantities are in base currency units:
```json
{
  "quantity": 10000  // 10,000 EUR for EUR/USD
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000
});

// Get current prices
const prices = await api.get('/prices');

// Execute a trade
const trade = await api.post('/trades', {
  symbol: 'EUR/USD',
  action: 'BUY',
  quantity: 10000
});

// Get trading signals
const signals = await api.get('/algorithms/signals/EUR/USD');
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3001/api'

# Get current prices
response = requests.get(f'{BASE_URL}/prices')
prices = response.json()

# Execute a trade
trade_data = {
    'symbol': 'EUR/USD',
    'action': 'BUY',
    'quantity': 10000
}
response = requests.post(f'{BASE_URL}/trades', json=trade_data)
trade = response.json()
```

This API design provides a comprehensive interface for all AlphaFxTrader functionality, supporting both REST and WebSocket protocols for optimal real-time trading performance.

