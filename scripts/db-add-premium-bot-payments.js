// Creates premium payment verification storage. Safe to re-run.
// Run from the backend folder: node scripts/db-add-premium-bot-payments.js
require('dotenv').config();
const mysql = require('mysql2/promise');

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
    CREATE TABLE IF NOT EXISTS premium_bot_payment (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      deleatedAt DATETIME(6) NULL,
      updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      userId VARCHAR(36) NOT NULL,
      transactionHash VARCHAR(128) NOT NULL UNIQUE,
      fromAddress VARCHAR(64) NOT NULL,
      toAddress VARCHAR(64) NOT NULL,
      tokenContract VARCHAR(64) NOT NULL,
      amount DECIMAL(18,6) NOT NULL,
      blockTimestamp DATETIME NOT NULL,
      status ENUM('verified') NOT NULL DEFAULT 'verified',
      verifiedAt DATETIME NOT NULL,
      INDEX IDX_premium_payment_user (userId),
      CONSTRAINT FK_premium_payment_user FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('OK   premium_bot_payment table ready');
  await conn.end();
})().catch(error => {
  console.error('Failed:', error.message);
  process.exit(1);
});