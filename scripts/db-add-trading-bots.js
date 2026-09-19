// Adds trading bot storage and bot metadata to bets. Safe to re-run.
// Run from the backend folder: node scripts/db-add-trading-bots.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return rows.length > 0;
}

async function addColumnIfMissing(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`SKIP ${table}.${column} already exists`);
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`OK   ${table}.${column} added`);
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS trading_bot (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      deleatedAt DATETIME(6) NULL,
      updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
      strategy ENUM('momentum','mean_reversion') NOT NULL,
      interval VARCHAR(10) NOT NULL DEFAULT '5m',
      isActive TINYINT NOT NULL DEFAULT 1,
      isPremium TINYINT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('OK   trading_bot table ready');

  const [botColumns] = await conn.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trading_bot' AND COLUMN_NAME = 'isPremium'
  `);
  if (botColumns.length === 0) {
    await conn.query("ALTER TABLE trading_bot ADD COLUMN isPremium TINYINT NOT NULL DEFAULT 0");
    console.log('OK   trading_bot.isPremium added');
  }

  const premiumBots = [
    ['ETH Momentum Pro', 'Premium momentum strategy for ETH using recent Binance candles.', 'ETHUSDT', 'momentum', '5m'],
    ['BTC Mean Reversion Pro', 'Premium BTC reversion strategy for extended market moves.', 'BTCUSDT', 'mean_reversion', '15m'],
    ['SOL Momentum Pro', 'Premium SOL momentum strategy using short-term market movement.', 'SOLUSDT', 'momentum', '5m'],
    ['ETH Mean Reversion Pro', 'Premium ETH strategy seeking reversals from its recent average.', 'ETHUSDT', 'mean_reversion', '15m'],
    ['Multi-Asset Breakout Pro', 'Premium BTC breakout strategy for high-momentum candle moves.', 'BTCUSDT', 'momentum', '30m'],
  ];
  for (const [name, description, symbol, strategy, interval] of premiumBots) {
    const [existing] = await conn.query('SELECT id FROM trading_bot WHERE name = ?', [name]);
    if (existing.length === 0) {
      await conn.query(
        'INSERT INTO trading_bot (id, name, description, symbol, strategy, interval, isActive, isPremium) VALUES (?, ?, ?, ?, ?, ?, 1, 1)',
        [randomUUID(), name, description, symbol, strategy, interval],
      );
      console.log(`OK   premium bot ${name} added`);
    }
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS bot_subscription (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      deleatedAt DATETIME(6) NULL,
      updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      userId VARCHAR(36) NOT NULL,
      botId VARCHAR(36) NOT NULL,
      amount DECIMAL(18,8) NOT NULL,
      period VARCHAR(10) NOT NULL DEFAULT '5m',
      isActive TINYINT NOT NULL DEFAULT 1,
      nextRunAt TIMESTAMP NOT NULL,
      INDEX IDX_bot_subscription_user (userId),
      INDEX IDX_bot_subscription_bot (botId),
      CONSTRAINT FK_bot_subscription_user FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
      CONSTRAINT FK_bot_subscription_bot FOREIGN KEY (botId) REFERENCES trading_bot(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('OK   bot_subscription table ready');

  await addColumnIfMissing(conn, 'bet', 'marketSymbol', "VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT'");
  await addColumnIfMissing(conn, 'bet', 'botId', 'VARCHAR(36) NULL');

  const [foreignKeys] = await conn.query(`
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bet'
      AND COLUMN_NAME = 'botId' AND REFERENCED_TABLE_NAME = 'trading_bot'
  `);
  if (foreignKeys.length === 0) {
    await conn.query(
      'ALTER TABLE bet ADD INDEX IDX_bet_bot (botId), ADD CONSTRAINT FK_bet_bot FOREIGN KEY (botId) REFERENCES trading_bot(id) ON DELETE SET NULL',
    );
    console.log('OK   bet.botId foreign key added');
  } else {
    console.log('SKIP bet.botId foreign key already exists');
  }

  await conn.end();
})().catch(error => {
  console.error('Failed:', error.message);
  process.exit(1);
});