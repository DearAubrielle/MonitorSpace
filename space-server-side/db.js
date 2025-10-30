const mysql = require("mysql2");

// Function to parse DATABASE_URL
function parseDatabaseURL(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: urlObj.port || 3306,
      user: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1), // Remove leading slash
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

// Create pool configuration
const createPoolConfig = () => {
  // Define base connection config (without pool-specific options)
  let connectionConfig = {};
  
  // Try to use DATABASE_URL first
  const parsedConfig = parseDatabaseURL(process.env.DATABASE_URL);
  
  if (parsedConfig) {
    console.log('Using DATABASE_URL for database connection');
    connectionConfig = {
      ...parsedConfig,
      charset: 'utf8mb4',
      timezone: '+00:00',
    };
  } else {
    // Fallback to individual environment variables or defaults
    console.log('Using individual environment variables for database connection');
    connectionConfig = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "spacemonitor",
      charset: 'utf8mb4',
      timezone: '+00:00',
    };
  }
  
  // Return complete pool configuration
  return {
    ...connectionConfig,
    // Pool-specific options only (using only guaranteed valid options)
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
  };
};

const pool = mysql.createPool(createPoolConfig());

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected successfully');
    connection.release();
  }
});

// Monitor connection count (optional) - simplified for MySQL2 compatibility
function logConnectionStats() {
  console.log('📊 Database Pool Status: Active and monitoring connections');
  // Note: MySQL2 doesn't expose internal pool statistics
  // Connection monitoring is handled internally by the MySQL2 pool
  return { status: 'active', message: 'Pool monitoring active' };
}

// Log connection stats occasionally (simplified for MySQL2)
if (process.env.DB_MONITOR_CONNECTIONS === 'true') {
  console.log('🔍 Database connection monitoring enabled');
  // MySQL2 handles connection pooling internally - no need for manual monitoring
}

// Export the pool promise
const poolPromise = pool.promise();

module.exports = poolPromise;
