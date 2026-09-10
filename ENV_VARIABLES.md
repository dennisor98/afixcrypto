# Environment Variables Documentation

This document lists all environment variables required for the backend application.

## Required Environment Variables

Copy this template to create your `.env` file in the `btc_backend` directory.

```env
# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=development
APP_PORT=3001
APP_NAME=XRP
APP_VERSION=1.0.0
APP_DESCRIPTION=The XRP API description
API_VERSION=1.0

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# ============================================
# DATABASE CONFIGURATION (MySQL)
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your-database-password
DB_NAME=your-database-name
DB_SYNCHRONIZE=false
DB_LOGGING=false
DB_TIMEZONE=+00:00

# ============================================
# REDIS CONFIGURATION (for Bull Queue)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_STALLED_INTERVAL=30000
REDIS_MAX_STALLED_COUNT=1

# ============================================
# EMAIL CONFIGURATION (Nodemailer)
# ============================================
MAILER_SERVICE=Gmail
MAILER_USER=your-email@gmail.com
MAILER_PASS=your-app-specific-password
MAILER_FROM=XRP <noreply@yourcompany.com>
SUPPORT_LINK=https://t.me/XRPcustomercare

# ============================================
# TRON BLOCKCHAIN CONFIGURATION
# ============================================
# TronGrid API endpoints
TRON_FULL_NODE_URL=https://api.trongrid.io
TRON_SOLIDITY_NODE_URL=https://api.trongrid.io
TRON_EVENT_SERVER_URL=https://api.trongrid.io

# TronGrid Pro API Key (for transaction queries)
TRON_PRO_API_KEY=your-trongrid-pro-api-key

# USDT Contract Address (TRC20)
TRON_USDT_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

# Address to monitor for deposits
TRON_MONITORED_ADDRESS=your-tron-address-to-monitor

# Transfer configuration (for withdrawals)
TRON_TRANSFER_FROM_ADDRESS=your-tron-wallet-address
TRON_TRANSFER_TO_ADDRESS=recipient-address
TRON_TRANSFER_PRIVATE_KEY=your-tron-wallet-private-key

# ============================================
# BINANCE API CONFIGURATION
# ============================================
# Binance API credentials for withdrawals
BINANCE_WITHDRAW_API_KEY=your-binance-api-key
BINANCE_WITHDRAW_API_SECRET=your-binance-api-secret

# Binance API credentials for withdrawal history
BINANCE_HISTORY_API_KEY=your-binance-api-key
BINANCE_HISTORY_API_SECRET=your-binance-api-secret

# ============================================
# SWAGGER DOCUMENTATION
# ============================================
SWAGGER_PATH=Eqsrx5yW5*dTSgDD
SWAGGER_DEFAULT_BEARER=your-default-bearer-token-for-swagger
SWAGGER_TAG=XRPCapital
```

## Variable Descriptions

### Application Configuration
- **NODE_ENV**: Environment mode (`development`, `production`, `test`)
- **APP_PORT**: Port number for the application server (default: 3001)
- **APP_NAME**: Application name used in emails and Swagger docs
- **APP_VERSION**: Application version number
- **APP_DESCRIPTION**: Application description for Swagger
- **API_VERSION**: API version number

### JWT Authentication
- **JWT_SECRET**: Secret key for signing and verifying JWT tokens (⚠️ **REQUIRED** - Use a strong random string in production)

### Database Configuration (MySQL)

#### For Aiven MySQL Service:

To get your database credentials from Aiven:

1. **Log in to Aiven Console**: Go to [https://console.aiven.io](https://console.aiven.io)

2. **Select your MySQL service**: Click on your MySQL service from the services list

3. **Go to "Overview" tab**: You'll see connection information here

4. **Get connection details**:
   - **DB_HOST**: Found in the "Host" field (e.g., `your-service-name.a.aivencloud.com`)
   - **DB_PORT**: Found in the "Port" field (usually `3306` for MySQL, or a custom port)
   - **DB_USER**: Found in the "User" field (default is usually `avnadmin`)
   - **DB_PASS**: Click "Show password" or "Reset password" button to view/reset
   - **DB_NAME**: Found in the "Database name" field (default is usually `defaultdb`)

5. **Alternative - Connection String Method**:
   - Go to the "Connection information" section
   - Look for "Connection string" or "Connection URI"
   - It will look like: `mysql://avnadmin:PASSWORD@HOST:PORT/DATABASE?ssl-mode=REQUIRED`
   - Parse the connection string to extract:
     - `DB_USER`: The username before `@`
     - `DB_PASS`: The password (between `://` and `@`)
     - `DB_HOST`: The hostname after `@` and before `:`
     - `DB_PORT`: The port number after `:` and before `/`
     - `DB_NAME`: The database name after `/` and before `?`

6. **SSL Configuration** (if needed):
   - Aiven uses SSL by default
   - You may need to download the CA certificate from the "Connection information" section
   - Add SSL configuration to your TypeORM connection if required

**Example Aiven values:**
```env
DB_HOST=your-service-name.a.aivencloud.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASS=your-aiven-password-here
DB_NAME=defaultdb
```

#### General MySQL Configuration:
- **DB_HOST**: MySQL database host
- **DB_PORT**: MySQL database port (default: 3306)
- **DB_USER**: MySQL database username
- **DB_PASS**: MySQL database password (⚠️ **REQUIRED**)
- **DB_NAME**: MySQL database name (⚠️ **REQUIRED**)
- **DB_SYNCHRONIZE**: Auto-sync database schema (⚠️ Set to `false` in production)
- **DB_LOGGING**: Enable SQL query logging
- **DB_TIMEZONE**: Database timezone (e.g., `+00:00`)

### Redis Configuration
- **REDIS_HOST**: Redis server host
- **REDIS_PORT**: Redis server port (default: 6379)
- **REDIS_STALLED_INTERVAL**: Interval for checking stalled jobs (milliseconds)
- **REDIS_MAX_STALLED_COUNT**: Maximum number of stalled jobs

### Email Configuration
- **MAILER_SERVICE**: Email service provider (default: `Gmail`)
- **MAILER_USER**: Email address for sending emails (⚠️ **REQUIRED**)
- **MAILER_PASS**: Email password or app-specific password (⚠️ **REQUIRED**)
- **MAILER_FROM**: From address for emails
- **SUPPORT_LINK**: Support contact link (default: Telegram link)

### Tron Blockchain Configuration
- **TRON_FULL_NODE_URL**: TronGrid full node endpoint (default: `https://api.trongrid.io`)
- **TRON_SOLIDITY_NODE_URL**: TronGrid solidity node endpoint
- **TRON_EVENT_SERVER_URL**: TronGrid event server endpoint
- **TRON_PRO_API_KEY**: TronGrid Pro API key for transaction queries (⚠️ **REQUIRED** for transaction checking)
- **TRON_USDT_CONTRACT**: USDT TRC20 contract address (default: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`)
- **TRON_MONITORED_ADDRESS**: Tron address to monitor for deposits
- **TRON_TRANSFER_FROM_ADDRESS**: Source wallet address for transfers
- **TRON_TRANSFER_TO_ADDRESS**: Destination wallet address for transfers
- **TRON_TRANSFER_PRIVATE_KEY**: Private key for signing transfers (⚠️ **REQUIRED** for withdrawals - Keep secure!)

### Binance API Configuration
- **BINANCE_WITHDRAW_API_KEY**: Binance API key for withdrawals (⚠️ **REQUIRED** for withdrawals)
- **BINANCE_WITHDRAW_API_SECRET**: Binance API secret for withdrawals (⚠️ **REQUIRED** for withdrawals)
- **BINANCE_HISTORY_API_KEY**: Binance API key for withdrawal history (⚠️ **REQUIRED** for withdrawal tracking)
- **BINANCE_HISTORY_API_SECRET**: Binance API secret for withdrawal history (⚠️ **REQUIRED** for withdrawal tracking)

### Swagger Documentation
- **SWAGGER_PATH**: Custom path for Swagger UI (default: `Eqsrx5yW5*dTSgDD`)
- **SWAGGER_DEFAULT_BEARER**: Default bearer token for Swagger (optional)
- **SWAGGER_TAG**: Tag name for Swagger documentation (default: `XRPCapital`)

## Critical Variables (Must Be Set)

These variables are required for the application to function:

1. **JWT_SECRET** - Authentication will fail without this
2. **DB_HOST**, **DB_USER**, **DB_PASS**, **DB_NAME** - Database connection
3. **MAILER_USER**, **MAILER_PASS** - Email functionality
4. **TRON_PRO_API_KEY** - Transaction checking
5. **TRON_TRANSFER_PRIVATE_KEY** - Withdrawal functionality
6. **BINANCE_WITHDRAW_API_KEY**, **BINANCE_WITHDRAW_API_SECRET** - Withdrawals
7. **BINANCE_HISTORY_API_KEY**, **BINANCE_HISTORY_API_SECRET** - Withdrawal tracking

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit your `.env` file to version control
- Use strong, random values for `JWT_SECRET` in production
- Keep `TRON_TRANSFER_PRIVATE_KEY` and all API secrets secure
- Set `DB_SYNCHRONIZE=false` in production
- Use environment-specific values for production vs development

