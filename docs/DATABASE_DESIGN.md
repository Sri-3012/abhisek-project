# AlphaFxTrader - Database Design Document

## Overview

The AlphaFxTrader database is designed using SQLite for development and can be easily migrated to PostgreSQL for production. The database schema supports real-time forex trading operations, technical analysis, trade management, and performance tracking.

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Currency Pairs │    │   Price Data    │    │Technical Indicators│
│                 │    │                 │    │                 │
│ id (PK)         │◄───┤ symbol (FK)     │◄───┤ symbol (FK)     │
│ symbol (UK)     │    │ bid_price       │    │ indicator_type  │
│ base_currency   │    │ ask_price       │    │ period          │
│ quote_currency  │    │ mid_price       │    │ value           │
│ is_active       │    │ timestamp       │    │ timestamp       │
│ created_at      │    │ volume          │    │                 │
│ updated_at      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Trades      │    │Trading Sessions │    │ Notifications   │
│                 │    │                 │    │                 │
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ symbol (FK)     │    │ session_name    │    │ type            │
│ action          │    │ start_time      │    │ title           │
│ quantity        │    │ end_time        │    │ message         │
│ price           │    │ total_volume    │    │ symbol          │
│ status          │    │ total_trades    │    │ is_read         │
│ algorithm_used  │    │ total_pnl       │    │ created_at      │
│ pnl             │    │ status          │    │                 │
│ created_at      │    │ created_at      │    │                 │
│ filled_at       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Algorithm Performance│ │Risk Management  │    │ Backtest Results│
│                 │    │ Rules           │    │                 │
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ algorithm_name  │    │ rule_name       │    │ algorithm_name  │
│ symbol (FK)     │    │ rule_type       │    │ symbol (FK)     │
│ total_trades    │    │ value           │    │ start_date      │
│ winning_trades  │    │ is_active       │    │ end_date        │
│ losing_trades   │    │ created_at      │    │ initial_capital │
│ total_pnl       │    │ updated_at      │    │ final_capital   │
│ win_rate        │    │                 │    │ total_return    │
│ sharpe_ratio    │    │                 │    │ sharpe_ratio    │
│ max_drawdown    │    │                 │    │ max_drawdown    │
│ period_start    │    │                 │    │ total_trades    │
│ period_end      │    │                 │    │ win_rate        │
│ created_at      │    │                 │    │ parameters      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Table Definitions

### 1. Currency Pairs Table

**Purpose**: Store supported currency pair information

```sql
CREATE TABLE currency_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,           -- e.g., 'EUR/USD'
    base_currency TEXT NOT NULL,           -- e.g., 'EUR'
    quote_currency TEXT NOT NULL,          -- e.g., 'USD'
    is_active BOOLEAN DEFAULT 1,           -- Trading status
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `UNIQUE INDEX idx_currency_pairs_symbol ON currency_pairs(symbol)`
- `INDEX idx_currency_pairs_active ON currency_pairs(is_active)`

**Sample Data**:
```sql
INSERT INTO currency_pairs (symbol, base_currency, quote_currency) VALUES
('EUR/USD', 'EUR', 'USD'),
('GBP/USD', 'GBP', 'USD'),
('USD/JPY', 'USD', 'JPY'),
('AUD/USD', 'AUD', 'USD'),
('USD/CAD', 'USD', 'CAD');
```

### 2. Price Data Table

**Purpose**: Store real-time and historical price data

```sql
CREATE TABLE price_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,                  -- Currency pair symbol
    bid_price REAL NOT NULL,               -- Bid price
    ask_price REAL NOT NULL,               -- Ask price
    mid_price REAL NOT NULL,               -- Mid price (bid+ask)/2
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    volume INTEGER DEFAULT 0,              -- Trading volume
    FOREIGN KEY (symbol) REFERENCES currency_pairs(symbol)
);
```

**Indexes**:
- `INDEX idx_price_data_symbol_timestamp ON price_data(symbol, timestamp)`
- `INDEX idx_price_data_timestamp ON price_data(timestamp)`

**Data Retention**: 7 days for real-time data, longer for historical analysis

### 3. Technical Indicators Table

**Purpose**: Store calculated technical indicators

```sql
CREATE TABLE technical_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,                  -- Currency pair symbol
    indicator_type TEXT NOT NULL,          -- 'SMA', 'EMA', 'RSI', 'BOLLINGER'
    period INTEGER NOT NULL,               -- Indicator period
    value REAL NOT NULL,                   -- Calculated value
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol) REFERENCES currency_pairs(symbol)
);
```

**Indexes**:
- `INDEX idx_technical_indicators_symbol_type ON technical_indicators(symbol, indicator_type)`
- `INDEX idx_technical_indicators_timestamp ON technical_indicators(timestamp)`

**Indicator Types**:
- `SMA`: Simple Moving Average
- `EMA`: Exponential Moving Average
- `RSI`: Relative Strength Index
- `BOLLINGER_UPPER`: Bollinger Bands Upper
- `BOLLINGER_MIDDLE`: Bollinger Bands Middle
- `BOLLINGER_LOWER`: Bollinger Bands Lower

### 4. Trades Table

**Purpose**: Store all trade transactions

```sql
CREATE TABLE trades (
    id TEXT PRIMARY KEY,                   -- UUID trade identifier
    symbol TEXT NOT NULL,                  -- Currency pair symbol
    action TEXT NOT NULL,                  -- 'BUY' or 'SELL'
    quantity INTEGER NOT NULL,             -- Trade quantity
    price REAL NOT NULL,                   -- Execution price
    status TEXT DEFAULT 'PENDING',         -- 'PENDING', 'FILLED', 'CANCELLED', 'REJECTED'
    algorithm_used TEXT,                   -- Algorithm that generated the trade
    pnl REAL DEFAULT 0,                    -- Profit/Loss
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    filled_at DATETIME,                    -- Execution timestamp
    FOREIGN KEY (symbol) REFERENCES currency_pairs(symbol)
);
```

**Indexes**:
- `INDEX idx_trades_symbol_created_at ON trades(symbol, created_at)`
- `INDEX idx_trades_status ON trades(status)`
- `INDEX idx_trades_algorithm ON trades(algorithm_used)`

**Trade Lifecycle**:
1. `PENDING`: Trade created, awaiting execution
2. `FILLED`: Trade executed successfully
3. `CANCELLED`: Trade cancelled by user/system
4. `REJECTED`: Trade rejected due to validation failure

### 5. Trading Sessions Table

**Purpose**: Track trading session statistics

```sql
CREATE TABLE trading_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_name TEXT NOT NULL,            -- Session identifier
    start_time DATETIME NOT NULL,          -- Session start
    end_time DATETIME,                     -- Session end
    total_volume INTEGER DEFAULT 0,        -- Total trading volume
    total_trades INTEGER DEFAULT 0,        -- Total number of trades
    total_pnl REAL DEFAULT 0,              -- Total profit/loss
    status TEXT DEFAULT 'ACTIVE',          -- 'ACTIVE', 'STOPPED', 'COMPLETED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `INDEX idx_trading_sessions_status ON trading_sessions(status)`
- `INDEX idx_trading_sessions_start_time ON trading_sessions(start_time)`

### 6. Algorithm Performance Table

**Purpose**: Track algorithm performance metrics

```sql
CREATE TABLE algorithm_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    algorithm_name TEXT NOT NULL,          -- Algorithm identifier
    symbol TEXT NOT NULL,                  -- Currency pair
    total_trades INTEGER DEFAULT 0,        -- Total trades executed
    winning_trades INTEGER DEFAULT 0,      -- Profitable trades
    losing_trades INTEGER DEFAULT 0,       -- Losing trades
    total_pnl REAL DEFAULT 0,              -- Total profit/loss
    win_rate REAL DEFAULT 0,               -- Win percentage
    sharpe_ratio REAL DEFAULT 0,           -- Risk-adjusted return
    max_drawdown REAL DEFAULT 0,           -- Maximum drawdown
    period_start DATETIME NOT NULL,        -- Performance period start
    period_end DATETIME NOT NULL,          -- Performance period end
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol) REFERENCES currency_pairs(symbol)
);
```

**Indexes**:
- `INDEX idx_algorithm_performance_name ON algorithm_performance(algorithm_name)`
- `INDEX idx_algorithm_performance_symbol ON algorithm_performance(symbol)`
- `INDEX idx_algorithm_performance_period ON algorithm_performance(period_start, period_end)`

### 7. Notifications Table

**Purpose**: Store system notifications and alerts

```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                    -- Notification type
    title TEXT NOT NULL,                   -- Notification title
    message TEXT NOT NULL,                 -- Notification message
    symbol TEXT,                           -- Related currency pair
    is_read BOOLEAN DEFAULT 0,             -- Read status
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `INDEX idx_notifications_is_read ON notifications(is_read)`
- `INDEX idx_notifications_type ON notifications(type)`
- `INDEX idx_notifications_created_at ON notifications(created_at)`

**Notification Types**:
- `PRICE_ALERT`: Price threshold alerts
- `TRADE_EXECUTED`: Trade execution confirmations
- `SYSTEM`: System messages and updates
- `RISK_MANAGEMENT`: Risk management alerts

### 8. Risk Management Rules Table

**Purpose**: Store risk management configuration

```sql
CREATE TABLE risk_management_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,               -- Rule identifier
    rule_type TEXT NOT NULL,               -- Rule type
    value REAL NOT NULL,                   -- Rule value
    is_active BOOLEAN DEFAULT 1,           -- Rule status
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `INDEX idx_risk_management_rules_type ON risk_management_rules(rule_type)`
- `INDEX idx_risk_management_rules_active ON risk_management_rules(is_active)`

**Rule Types**:
- `MAX_VOLUME`: Maximum daily trading volume
- `MAX_LOSS`: Maximum daily loss limit
- `STOP_LOSS`: Stop loss percentage
- `TAKE_PROFIT`: Take profit percentage

### 9. Backtest Results Table

**Purpose**: Store algorithm backtesting results

```sql
CREATE TABLE backtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    algorithm_name TEXT NOT NULL,          -- Algorithm tested
    symbol TEXT NOT NULL,                  -- Currency pair
    start_date DATETIME NOT NULL,          -- Backtest start
    end_date DATETIME NOT NULL,            -- Backtest end
    initial_capital REAL NOT NULL,         -- Starting capital
    final_capital REAL NOT NULL,           -- Ending capital
    total_return REAL NOT NULL,            -- Total return percentage
    sharpe_ratio REAL NOT NULL,            -- Risk-adjusted return
    max_drawdown REAL NOT NULL,            -- Maximum drawdown
    total_trades INTEGER NOT NULL,         -- Total trades
    win_rate REAL NOT NULL,                -- Win rate percentage
    parameters TEXT,                       -- Algorithm parameters (JSON)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol) REFERENCES currency_pairs(symbol)
);
```

**Indexes**:
- `INDEX idx_backtest_results_algorithm ON backtest_results(algorithm_name)`
- `INDEX idx_backtest_results_symbol ON backtest_results(symbol)`
- `INDEX idx_backtest_results_return ON backtest_results(total_return)`

## Data Relationships

### Primary Relationships

1. **Currency Pairs → Price Data**: One-to-Many
   - Each currency pair can have multiple price records
   - Foreign key: `price_data.symbol → currency_pairs.symbol`

2. **Currency Pairs → Trades**: One-to-Many
   - Each currency pair can have multiple trades
   - Foreign key: `trades.symbol → currency_pairs.symbol`

3. **Currency Pairs → Technical Indicators**: One-to-Many
   - Each currency pair can have multiple indicator values
   - Foreign key: `technical_indicators.symbol → currency_pairs.symbol`

4. **Trades → Algorithm Performance**: Many-to-One
   - Multiple trades contribute to algorithm performance
   - Relationship through `algorithm_used` field

### Data Flow Relationships

1. **Price Data → Technical Indicators**: Calculated from price data
2. **Technical Indicators → Trades**: Used for trade signal generation
3. **Trades → Trading Sessions**: Aggregated into session statistics
4. **Trades → Notifications**: Generate trade execution notifications

## Performance Optimization

### Indexing Strategy

1. **Composite Indexes**: For multi-column queries
   ```sql
   CREATE INDEX idx_price_data_symbol_timestamp ON price_data(symbol, timestamp);
   ```

2. **Partial Indexes**: For filtered queries
   ```sql
   CREATE INDEX idx_trades_active ON trades(symbol, created_at) WHERE status = 'FILLED';
   ```

3. **Covering Indexes**: To avoid table lookups
   ```sql
   CREATE INDEX idx_trades_covering ON trades(symbol, action, price, created_at);
   ```

### Query Optimization

1. **Data Partitioning**: Partition price data by time periods
2. **Data Archiving**: Move old data to archive tables
3. **Connection Pooling**: Efficient database connections
4. **Prepared Statements**: Use parameterized queries

### Data Retention Policies

1. **Price Data**: 7 days for real-time, 1 year for historical
2. **Technical Indicators**: 30 days for real-time, 1 year for historical
3. **Trades**: Permanent retention
4. **Notifications**: 90 days
5. **Backtest Results**: Permanent retention

## Data Integrity

### Constraints

1. **Primary Keys**: All tables have unique primary keys
2. **Foreign Keys**: Referential integrity maintained
3. **Check Constraints**: Validate data ranges and formats
4. **Unique Constraints**: Prevent duplicate data

### Validation Rules

1. **Price Data**: Bid < Ask, positive values
2. **Trades**: Valid action (BUY/SELL), positive quantity
3. **Technical Indicators**: Valid indicator types and periods
4. **Notifications**: Required fields validation

## Backup and Recovery

### Backup Strategy

1. **Full Backups**: Daily complete database backup
2. **Incremental Backups**: Hourly incremental changes
3. **Transaction Logs**: Continuous transaction logging
4. **Point-in-Time Recovery**: Restore to specific timestamps

### Recovery Procedures

1. **Database Corruption**: Restore from latest backup
2. **Data Loss**: Point-in-time recovery
3. **Schema Changes**: Version-controlled migrations
4. **Performance Issues**: Index rebuilding and optimization

## Security Considerations

### Data Protection

1. **Encryption**: Sensitive data encryption at rest
2. **Access Control**: Role-based database access
3. **Audit Logging**: Track all database changes
4. **SQL Injection Prevention**: Parameterized queries only

### Compliance

1. **Data Retention**: Regulatory compliance requirements
2. **Audit Trails**: Complete transaction history
3. **Privacy**: Personal data protection
4. **Reporting**: Regulatory reporting capabilities

## Migration Strategy

### Development to Production

1. **Schema Migration**: Version-controlled schema changes
2. **Data Migration**: ETL processes for data transfer
3. **Performance Testing**: Load testing before deployment
4. **Rollback Plan**: Quick rollback procedures

### Database Upgrades

1. **Version Control**: Track schema versions
2. **Migration Scripts**: Automated upgrade procedures
3. **Testing**: Comprehensive testing before deployment
4. **Monitoring**: Post-deployment monitoring

This database design provides a robust foundation for the AlphaFxTrader application, supporting real-time trading operations, comprehensive analytics, and scalable performance.

