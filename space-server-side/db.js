const mysql = require('mysql2/promise');
require('dotenv').config();

// The pool can accept the connection string directly as the first argument
const pool = mysql.createPool(process.env.DATABASE_URL);

// Quick connection test
(async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
})();

module.exports = pool;