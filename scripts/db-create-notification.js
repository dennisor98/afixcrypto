// Creates the notification table. Safe to re-run: it checks first and
// makes no changes if the table already exists.
// Run from the backend folder:  node scripts/db-create-notification.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// Column names match DefaultEntity, including the deleatedAt spelling.
// `read` is a reserved word in MySQL so it stays backticked.
const CREATE_TABLE = `
CREATE TABLE notification (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  createdAt   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  deleatedAt  DATETIME(6) NULL,
  updatedAt   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  type        ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  \`read\`      TINYINT NOT NULL DEFAULT 0,
  userId      VARCHAR(36) NULL,
  INDEX IDX_notification_user (userId),
  CONSTRAINT FK_notification_user
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }, // Aiven requires SSL
  });

  const [existing] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification'`,
  );

  if (existing.length > 0) {
    console.log('SKIP notification table already exists');
  } else {
    await conn.query(CREATE_TABLE);
    console.log('OK   notification table created');
  }

  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification'
     ORDER BY ORDINAL_POSITION`,
  );
  console.log('\nnotification columns:');
  console.table(cols);

  await conn.end();
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});