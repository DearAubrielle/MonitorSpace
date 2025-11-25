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
      timezone: '+00:07',
    };
  } else {
    // Fallback to individual environment variables or defaults
    console.log('Using individual environment variables for database connection');
    connectionConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "spacemonitor",
      charset: 'utf8mb4',
      timezone: '+00:07',
    };
  }
  
  // Return complete pool configuration
  return {
    ...connectionConfig,
    // Pool-specific options optimized for 1GB RAM constraint
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 25, // Conservative limit for 1GB RAM
    queueLimit: 50, // Limit queued requests to prevent memory issues
    idleTimeout: 180000, // 3 minutes idle timeout for faster cleanup
    maxIdle: 5, // Reduced idle connections for memory efficiency
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

// Handle pool errors
pool.on('connection', (connection) => {
  console.log('New database connection established as id ' + connection.threadId);
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed.');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    console.log('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    console.log('Database connection was refused.');
  }
});

// Monitor connection health with basic stats
function logConnectionStats() {
  try {
    // Get basic pool info
    const poolConfig = pool.config;
    console.log('📊 Database Pool Status:', {
      connectionLimit: poolConfig.connectionLimit,
      host: poolConfig.host,
      database: poolConfig.database,
      status: 'active'
    });
    return { status: 'active', message: 'Pool monitoring active' };
  } catch (error) {
    console.error('Error getting pool stats:', error);
    return { status: 'error', message: error.message };
  }
}

// Periodic connection health check
function startConnectionMonitoring() {
  setInterval(async () => {
    try {
      await poolPromise.execute('SELECT 1');
      // console.log('✅ Database health check passed');
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
    }
  }, 30000); // Check every 30 seconds
}

// Log connection stats occasionally and start monitoring
if (process.env.DB_MONITOR_CONNECTIONS === 'true') {
  console.log('🔍 Database connection monitoring enabled');
  logConnectionStats();
  startConnectionMonitoring();
}

// Export the pool promise
const poolPromise = pool.promise();

module.exports = poolPromise;
