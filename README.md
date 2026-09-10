# afixcrypto Backend

NestJS API server powering the [afixcrypto](https://github.com/Mogusu2/btc_front) binary BTC options trading platform.

## Features

- **Authentication**: Email + password + mandatory OTP, JWT access + refresh tokens
- **Three-tier roles**: user, admin, super_admin
- **Trading engine**: 5-minute BTC prediction windows powered by Binance market data
- **TRON USDT wallet**: Auto-generated per user, with deposit detection and Binance-backed withdrawals
- **Admin portal**: User management, audit logging, platform settings, kill switches
- **Security**: AES-256-GCM private key encryption, rate limiting, input validation
- **Monitoring**: Sentry error tracking, audit log of all admin actions

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: MySQL (via TypeORM)
- **Queue**: Bull on Redis (Upstash)
- **Auth**: JWT, bcrypt
- **Email**: Resend
- **Blockchain**: tronweb
- **Validation**: class-validator
- **Monitoring**: @sentry/nestjs
- **API docs**: Swagger

## Prerequisites

- Node.js 20+ and pnpm 8+
- MySQL 8.x (or [Aiven](https://aiven.io) managed instance)
- Redis (or [Upstash](https://upstash.com) serverless)
- Resend account for transactional emails
- TronGrid API key (free at [trongrid.io](https://www.trongrid.io))
- Binance account with API key (for withdrawals)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/Mogusu2/BTC_Backend.git
cd BTC_Backend
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) below for what each value means.

### 4. Generate secrets

```bash
# JWT_SECRET — token signing key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY — for encrypting user private keys (back this up!)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste these into your `.env` file.

### 5. Start the server

Development mode (auto-reload on file changes):

```bash
pnpm start:dev
```

Server runs on `http://localhost:3001`.

Swagger docs at `http://localhost:3001/api/docs`.

On first startup with `DB_SYNCHRONIZE=true`, TypeORM creates all tables. After that, set `DB_SYNCHRONIZE=false` and use migrations.

The super admin seeder runs on startup. If `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` are set, it either creates that user as `super_admin` or upgrades an existing user.

## Environment Variables

```env
# === Application ===
NODE_ENV=development
APP_NAME=afixcrypto API
APP_VERSION=1.0.0
API_VERSION=1.0.0
APP_PORT=3001
FRONTEND_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3000

# === Database (Aiven MySQL or local) ===
DB_HOST=mysql-xxx.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASS=your-password
DB_NAME=defaultdb
DB_SYNCHRONIZE=true        # TRUE for dev, FALSE for production
DB_LOGGING=true
DB_TIMEZONE=Z

# === Auth ===
JWT_SECRET=                 # 64-char hex string
ENCRYPTION_KEY=             # 64-char hex string (BACK THIS UP — irreplaceable)

# === Redis (Upstash) ===
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=true

# === Email (Resend) ===
RESEND_API_KEY=re_xxx
MAILER_FROM=onboarding@resend.dev

# === TRON Blockchain ===
TRON_GRID_API_BASE=https://api.trongrid.io
TRON_FULL_NODE_URL=https://api.trongrid.io
TRON_SOLIDITY_NODE_URL=https://api.trongrid.io
TRON_EVENT_SERVER_URL=https://api.trongrid.io
TRON_USDT_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t   # mainnet USDT
TREASURY_ADDRESS=T...
TREASURY_PRIVATE_KEY=       # 64-hex, will be loaded as-is
TRON_PRO_API_KEY=
TRON_FEE_LIMIT=15000000

# === Binance (for withdrawals) ===
BINANCE_WITHDRAW_API_KEY=
BINANCE_WITHDRAW_API_SECRET=
BINANCE_HISTORY_API_KEY=
BINANCE_HISTORY_API_SECRET=
BINANCE_WITHDRAW_NETWORK=TRX
BINANCE_WITHDRAW_COIN=USDT
BINANCE_RECV_WINDOW=60000
BINANCE_WITHDRAW_API_URL=https://api.binance.com
BINANCE_HISTORY_API_URL=https://api.binance.com

# === Withdrawal limits (overridden by PlatformSettings) ===
WITHDRAWAL_MIN_AMOUNT=10
WITHDRAWAL_TRANSACTION_FEE=1
WITHDRAWAL_SERVICE_FEE=1

# === Super Admin Seeder ===
SUPER_ADMIN_EMAIL=you@example.com
SUPER_ADMIN_PASSWORD=YourStrongPassword123!
SUPER_ADMIN_USERNAME=admin

# === Monitoring (Sentry) ===
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# === Misc ===
BET_LOSS_DELAY_MS=2000
SWAGGER_PATH=api/docs
SWAGGER_TAG=api
```

## Running

### Development
```bash
pnpm start:dev    # Watch mode, restarts on file changes
```

### Production
```bash
pnpm build        # Compile TypeScript to dist/
pnpm start:prod   # Run compiled code
```

### Testing
```bash
pnpm test         # Unit tests
pnpm test:e2e     # End-to-end tests
pnpm test:cov     # Coverage report
```

## Project Structure

```
src/
├── admin/              # Admin portal endpoints
│   ├── admin.controller.ts
│   ├── admin.service.ts
│   ├── admin.module.ts
│   └── entities/
│       ├── platform-settings.entity.ts
│       └── admin-audit-log.entity.ts
├── auth/               # Auth guards
│   ├── auth.guard.ts   # AuthGuard, AdminGuard, SuperAdminGuard
│   └── auth.module.ts
├── bets/               # Trading logic
│   ├── bets.controller.ts
│   ├── bets.service.ts
│   ├── bet.processor.ts (Bull queue worker)
│   └── entities/
├── common/             # Shared services
│   ├── crypto.util.ts  # AES-256-GCM helpers
│   ├── settings.service.ts (kill switch enforcement)
│   └── common.module.ts
├── mailer/             # Email service
│   ├── otp.service.ts  # Resend integration
│   └── mailer.module.ts
├── notifications/      # In-app notifications
├── referral/           # Referral system
├── tronwallet/         # TRON USDT operations
│   ├── tronwallet.service.ts
│   ├── tast.service.ts (deposit scanner)
│   └── entities/
├── user/               # User accounts
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── seeder.service.ts (super admin seeder)
│   ├── dto/
│   └── entities/
├── database/
│   ├── data-source.ts  # TypeORM CLI config
│   └── migrations/
├── app/
│   └── app.module.ts   # Root module
├── instrument.ts       # Sentry initialization (loaded first)
└── main.ts            # Bootstrap
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Dev server with watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run production build |
| `pnpm test` | Run unit tests |
| `pnpm migration:generate <path>` | Generate a migration from entity changes |
| `pnpm migration:run` | Apply pending migrations |
| `pnpm migration:revert` | Revert last migration |
| `pnpm migration:show` | List migrations and their status |

## Deployment

### Render (Recommended)

1. Sign up at [render.com](https://render.com) with GitHub
2. New → Web Service → connect this repo
3. Configure:
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start:prod`
   - Health Check Path: `/health`
4. Add all environment variables in the Environment tab
5. Allow Render's IPs in your Aiven database settings
6. Deploy

**Free tier note**: Render free tier sleeps after 15 mins idle. Set up [UptimeRobot](https://uptimerobot.com) to ping `/health` every 5 minutes to keep it warm, or upgrade to Starter ($7/mo).

### Production checklist

- [ ] `DB_SYNCHRONIZE=false`
- [ ] `DB_LOGGING=false`
- [ ] All secrets are production values (not reused from dev)
- [ ] `ENCRYPTION_KEY` backed up in password manager
- [ ] `SUPER_ADMIN_PASSWORD` set in env on first deploy, removed after
- [ ] Sentry DSN configured
- [ ] CORS limited to production frontend domain
- [ ] Health endpoint responds
- [ ] Migrations applied (or initial schema marked as applied)

See `SYSTEM_DOCUMENTATION.md` in the repo root for the complete deployment guide.

## Troubleshooting

### `Cannot find module 'cookie-parser'`
```bash
pnpm add cookie-parser @types/cookie-parser
```

### `Unable to connect to the database`
- Check DB env vars
- Aiven: whitelist your IP in Allowed IP Addresses
- For Render: whitelist `0.0.0.0/0` or get Render's egress IPs

### `DataTypeNotSupportedError: Data type "Object"`
A `string | null` column needs an explicit type. Use:
```typescript
@Column({ type: 'varchar', length: 255, nullable: true })
field: string | null;
```

### `Listen method has been called more than once`
Two `app.listen()` calls in `main.ts`. Keep only one.

### `Rate limited (429)` everywhere
You're hitting the throttler. Either:
- Restart backend (resets counters)
- Add `@SkipThrottle()` to safe-by-design endpoints
- Increase limits in `app.module.ts`

### Sentry shows "Sentry disabled"
- Check `SENTRY_DSN` is in `.env`
- Ensure `dotenv.config()` runs BEFORE `Sentry.init()` in `instrument.ts`
- The `import './instrument'` line must be FIRST in `main.ts`

## License

Proprietary. All rights reserved.
