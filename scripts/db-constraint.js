// Adds the non-negative balance constraint. Does not modify any data.
// Run from the backend folder:  node scripts/db-constraint.js
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

  // Safety net: MySQL rejects any write that would push a balance below zero
  try {
    await conn.query(
      'ALTER TABLE wallet ADD CONSTRAINT chk_amount_nonneg CHECK (amount >= 0)',
    );
    console.log('OK   non-negative balance constraint added');
  } catch (e) {
    if (e.code === 'ER_CHECK_CONSTRAINT_DUP_NAME') {
      console.log('SKIP constraint already exists');
    } else {
      throw e;
    }
  }

  const [rows] = await conn.query(`
    SELECT CONSTRAINT_NAME, CHECK_CLAUSE
    FROM information_schema.CHECK_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()`);
  console.log('\nConstraints on this database:');
  console.table(rows);

  await conn.end();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });