// Read-only pre-flight check. Makes no changes.
// Run from the backend folder:  node scripts/db-check.js
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }, // Aiven requires SSL
  });

  const show = async (label, sql) => {
    const [rows] = await conn.query(sql);
    console.log(`\n--- ${label} ---`);
    console.table(rows);
    return rows;
  };

  await show('Current wallet columns', `
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet' ORDER BY ORDINAL_POSITION`);

  await show('Current bet columns', `
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bet' ORDER BY ORDINAL_POSITION`);

  const bad1 = await show('Non-numeric wallet values (must be empty)', `
    SELECT id, amount, flows, virtualamount FROM wallet
    WHERE amount NOT REGEXP '^-?[0-9]+(\\\\.[0-9]+)?$'
       OR flows NOT REGEXP '^-?[0-9]+(\\\\.[0-9]+)?$'
       OR virtualamount NOT REGEXP '^-?[0-9]+(\\\\.[0-9]+)?$'`);

  const bad2 = await show('Non-numeric bet amounts (must be empty)', `
    SELECT id, betAmount FROM bet
    WHERE betAmount NOT REGEXP '^-?[0-9]+(\\\\.[0-9]+)?$'`);

  const bad3 = await show('Negative balances (must be empty)', `
    SELECT id, amount FROM wallet WHERE CAST(amount AS DECIMAL(18,8)) < 0`);

  const bad4 = await show('NULL balances (must be 0)', `
    SELECT COUNT(*) AS null_amounts FROM wallet WHERE amount IS NULL`);

  await show('Deposits vs balances', `
    SELECT u.id, u.email, w.amount AS wallet_balance,
           COALESCE(SUM(d.amount),0) AS total_deposited
    FROM user u
    JOIN wallet w ON w.userId = u.id
    LEFT JOIN tronwallet_deposits d ON d.userId = u.id
    GROUP BY u.id, u.email, w.amount
    HAVING total_deposited > 0
    ORDER BY total_deposited DESC`);

  const clean = !bad1.length && !bad2.length && !bad3.length && Number(bad4[0].null_amounts) === 0;
  console.log(clean
    ? '\nRESULT: data is clean, safe to migrate'
    : '\nRESULT: fix the flagged rows before migrating');

  await conn.end();
})().catch((e) => { console.error('Check failed:', e.message); process.exit(1); });