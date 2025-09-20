# AlphaFxTrader - Deployment Instructions

## Overview

This document provides comprehensive deployment instructions for the AlphaFxTrader forex trading application, covering both development and production environments.

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores, 2.4 GHz
- **RAM**: 4 GB
- **Storage**: 10 GB free space
- **Network**: Stable internet connection
- **OS**: Windows 10+, macOS 10.15+, or Ubuntu 18.04+

#### Recommended Requirements
- **CPU**: 4+ cores, 3.0+ GHz
- **RAM**: 8+ GB
- **Storage**: 50+ GB SSD
- **Network**: High-speed internet (100+ Mbps)
- **OS**: Latest stable version

### Software Dependencies

#### Required Software
- **Node.js**: 16.0+ (LTS recommended)
- **npm**: 8.0+ (comes with Node.js)
- **Git**: Latest version
- **SQLite**: 3.30+ (for development)
- **PostgreSQL**: 12+ (for production)

#### Optional Software
- **Docker**: 20.0+ (for containerized deployment)
- **PM2**: Latest version (for process management)
- **Nginx**: Latest version (for reverse proxy)

## Development Environment Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd alpha-fx-trader

# Verify structure
ls -la
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup

```bash
# Navigate to backend directory
cd ../backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit environment variables
nano .env
```

#### Environment Configuration

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_PATH=./data/trading.db

# API Configuration
EXCHANGE_RATE_API_KEY=your_api_key_here
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest

# Trading Configuration
MAX_TRADING_VOLUME=10000000
AUTO_TRADING_ENABLED=true
RISK_MANAGEMENT_ENABLED=true

# WebSocket Configuration
WS_PORT=3002

# Algorithm Configuration
SMA_SHORT_PERIOD=10
SMA_LONG_PERIOD=20
RSI_PERIOD=14
RSI_OVERBOUGHT=70
RSI_OVERSOLD=30
BOLLINGER_PERIOD=20
BOLLINGER_STD_DEV=2

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/trading.log
```

### 4. Start Backend Server

```bash
# Start development server
npm run dev

# Or start with nodemon for auto-restart
npm run dev
```

The backend will be available at `http://localhost:3001`

### 5. Verify Installation

```bash
# Test backend health
curl http://localhost:3001/health

# Test API endpoints
curl http://localhost:3001/api/prices

# Check WebSocket connection
# Use browser developer tools or WebSocket client
```

## Production Environment Setup

### 1. Server Preparation

#### Ubuntu/Debian Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash alphafxtrader
sudo usermod -aG sudo alphafxtrader
```

#### CentOS/RHEL Setup

```bash
# Update system
sudo yum update -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install Nginx
sudo yum install nginx -y

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup

#### PostgreSQL Configuration

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE alphafxtrader;
CREATE USER alphafxtrader WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE alphafxtrader TO alphafxtrader;
\q
```

#### Database Migration

```bash
# Navigate to backend directory
cd /opt/alphafxtrader/backend

# Install database migration tools
npm install -g db-migrate

# Run migrations
db-migrate up
```

### 3. Application Deployment

#### Directory Structure

```bash
# Create application directory
sudo mkdir -p /opt/alphafxtrader
sudo chown alphafxtrader:alphafxtrader /opt/alphafxtrader

# Clone repository
cd /opt/alphafxtrader
git clone <repository-url> .

# Install dependencies
cd frontend && npm install && npm run build
cd ../backend && npm install --production
```

#### Environment Configuration

```bash
# Create production environment file
cd /opt/alphafxtrader/backend
cp env.example .env.production

# Edit production configuration
nano .env.production
```

```env
# Production Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alphafxtrader
DB_USER=alphafxtrader
DB_PASSWORD=secure_password

# API Configuration
EXCHANGE_RATE_API_KEY=production_api_key
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest

# Trading Configuration
MAX_TRADING_VOLUME=10000000
AUTO_TRADING_ENABLED=true
RISK_MANAGEMENT_ENABLED=true

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/alphafxtrader/trading.log
```

### 4. Process Management with PM2

#### PM2 Configuration

```bash
# Create PM2 ecosystem file
cd /opt/alphafxtrader/backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'alphafxtrader-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/alphafxtrader/error.log',
    out_file: '/var/log/alphafxtrader/out.log',
    log_file: '/var/log/alphafxtrader/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u alphafxtrader --hp /home/alphafxtrader
```

### 5. Nginx Configuration

#### Nginx Setup

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/alphafxtrader
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /opt/alphafxtrader/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/alphafxtrader /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Docker Deployment

### 1. Docker Compose Setup

```bash
# Create Docker Compose file
nano docker-compose.yml
```

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://backend:3001

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=alphafxtrader
      - DB_USER=alphafxtrader
      - DB_PASSWORD=secure_password
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=alphafxtrader
      - POSTGRES_USER=alphafxtrader
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2. Dockerfile for Backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "server.js"]
```

### 3. Dockerfile for Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 4. Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Monitoring and Logging

### 1. Log Management

#### Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/alphafxtrader
```

```
/var/log/alphafxtrader/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 alphafxtrader alphafxtrader
    postrotate
        pm2 reload alphafxtrader-backend
    endscript
}
```

### 2. System Monitoring

#### Install Monitoring Tools

```bash
# Install htop for system monitoring
sudo apt install htop -y

# Install iotop for I/O monitoring
sudo apt install iotop -y

# Install netstat for network monitoring
sudo apt install net-tools -y
```

#### PM2 Monitoring

```bash
# Monitor PM2 processes
pm2 monit

# View logs
pm2 logs alphafxtrader-backend

# Restart application
pm2 restart alphafxtrader-backend

# View process information
pm2 show alphafxtrader-backend
```

### 3. Health Checks

#### Automated Health Monitoring

```bash
# Create health check script
nano /opt/alphafxtrader/health-check.sh
```

```bash
#!/bin/bash

# Health check script
API_URL="http://localhost:3001/health"
LOG_FILE="/var/log/alphafxtrader/health-check.log"

# Check API health
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $response -eq 200 ]; then
    echo "$(date): API is healthy" >> $LOG_FILE
else
    echo "$(date): API is unhealthy (HTTP $response)" >> $LOG_FILE
    # Restart PM2 process
    pm2 restart alphafxtrader-backend
fi
```

```bash
# Make script executable
chmod +x /opt/alphafxtrader/health-check.sh

# Add to crontab
crontab -e

# Add this line for every 5 minutes
*/5 * * * * /opt/alphafxtrader/health-check.sh
```

## Backup and Recovery

### 1. Database Backup

#### Automated Backup Script

```bash
# Create backup script
nano /opt/alphafxtrader/backup-db.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/opt/alphafxtrader/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="alphafxtrader"
DB_USER="alphafxtrader"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/alphafxtrader_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/alphafxtrader_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: alphafxtrader_$DATE.sql.gz"
```

```bash
# Make script executable
chmod +x /opt/alphafxtrader/backup-db.sh

# Add to crontab for daily backup
0 2 * * * /opt/alphafxtrader/backup-db.sh
```

### 2. Application Backup

```bash
# Create application backup script
nano /opt/alphafxtrader/backup-app.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/opt/alphafxtrader/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/alphafxtrader"

# Create backup
tar -czf $BACKUP_DIR/alphafxtrader_app_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=backups \
    $APP_DIR

echo "Application backup completed: alphafxtrader_app_$DATE.tar.gz"
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3001/tcp  # Block direct access to backend
```

### 2. SSL/TLS Configuration

#### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rest of configuration...
}
```

### 3. Application Security

#### Environment Security

```bash
# Secure environment file
chmod 600 /opt/alphafxtrader/backend/.env.production

# Set proper ownership
chown alphafxtrader:alphafxtrader /opt/alphafxtrader/backend/.env.production
```

## Troubleshooting

### 1. Common Issues

#### Port Already in Use

```bash
# Find process using port
sudo netstat -tulpn | grep :3001

# Kill process
sudo kill -9 <PID>
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U alphafxtrader -d alphafxtrader
```

#### PM2 Issues

```bash
# Reset PM2
pm2 kill
pm2 start ecosystem.config.js --env production

# Clear PM2 logs
pm2 flush
```

### 2. Performance Optimization

#### Node.js Optimization

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Use cluster mode
pm2 start ecosystem.config.js --instances max
```

#### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_price_data_symbol_timestamp ON price_data(symbol, timestamp);
CREATE INDEX CONCURRENTLY idx_trades_symbol_created_at ON trades(symbol, created_at);
```

## Maintenance

### 1. Regular Maintenance Tasks

#### Weekly Tasks
- Review application logs
- Check disk space usage
- Verify backup integrity
- Update system packages

#### Monthly Tasks
- Review performance metrics
- Update application dependencies
- Security audit
- Database maintenance

### 2. Update Procedures

#### Application Updates

```bash
# Create update script
nano /opt/alphafxtrader/update.sh
```

```bash
#!/bin/bash

APP_DIR="/opt/alphafxtrader"
BACKUP_DIR="/opt/alphafxtrader/backups"

# Create backup before update
./backup-app.sh

# Pull latest changes
cd $APP_DIR
git pull origin main

# Update dependencies
cd frontend && npm install && npm run build
cd ../backend && npm install --production

# Restart application
pm2 restart alphafxtrader-backend

echo "Update completed successfully"
```

This comprehensive deployment guide ensures a robust, scalable, and secure deployment of the AlphaFxTrader application in both development and production environments.

