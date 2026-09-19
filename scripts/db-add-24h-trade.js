// Adds the 24-hour trade fields. Safe to re-run.
// Run from the backend folder: node scripts/db-add-24h-trade.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addColumnIfMissing(conn, table, column, definition) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );

  if (rows.length > 0) {
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

  await addColumnIfMissing(
    conn,
    'bet',
    'tradeType',
    "ENUM('regular','24h') NOT NULL DEFAULT 'regular'",
  );
  await addColumnIfMissing(conn, 'bet', 'returnRate', 'DECIMAL(7,4) NULL');
  await addColumnIfMissing(
    conn,
    'platform_settings',
    'dailyTradeReturnRate',
    'DECIMAL(7,4) NOT NULL DEFAULT 5',
  );

  await conn.end();
})().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});