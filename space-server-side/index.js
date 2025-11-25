const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const db = require('./db'); // Make sure this is at the top if not already

dotenv.config();
const app = express();
const port = 8080;
const usersRoutes = require("./routes/users");
const floorplansRoutes = require("./routes/floorplans");


const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      process.env.CLIENT_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Mount routes
app.use("/api/users", usersRoutes);
app.use("/api/floorplans", floorplansRoutes);
app.use("/api/devices", require("./routes/devices"));
app.use('/private_uploads', express.static(path.join(__dirname, 'private_uploads')));


// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


// Broadcast helper
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}


// --- Send all device latest values every 5s (reduced frequency) ---
let broadcastErrors = 0;
const maxBroadcastErrors = 5;

const broadcastInterval = setInterval(async () => {
  try {
    const [rows] = await db.query(
      "SELECT id, latest_value FROM devices"
    );
    broadcast(rows); // send all devices in one packet
    broadcastErrors = 0; // Reset error count on success
    //console.log("Broadcasted device values");
  } catch (err) {
    broadcastErrors++;
    console.error(`❌ Database error during broadcast (${broadcastErrors}/${maxBroadcastErrors}):`, err.message);
    
    // If too many consecutive errors, stop broadcasting temporarily
    if (broadcastErrors >= maxBroadcastErrors) {
      console.error('🚨 Too many broadcast errors, pausing for 30 seconds...');
      clearInterval(broadcastInterval);
      
      // Restart broadcasting after 30 seconds
      setTimeout(() => {
        broadcastErrors = 0;
        startBroadcasting();
      }, 30000);
    }
  }
}, 5000); // Increased from 2000ms to 5000ms

function startBroadcasting() {
  console.log('🔄 Restarting device broadcasting...');
  return setInterval(async () => {
    try {
      const [rows] = await db.query(
        "SELECT id, latest_value FROM devices"
      );
      broadcast(rows);
      broadcastErrors = 0;
    } catch (err) {
      broadcastErrors++;
      console.error(`❌ Database error during broadcast (${broadcastErrors}/${maxBroadcastErrors}):`, err.message);
      
      if (broadcastErrors >= maxBroadcastErrors) {
        console.error('🚨 Too many broadcast errors, pausing for 30 seconds...');
        clearInterval(broadcastInterval);
        setTimeout(() => {
          broadcastErrors = 0;
          startBroadcasting();
        }, 30000);
      }
    }
  }, 5000);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully');
  clearInterval(broadcastInterval);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully');
  clearInterval(broadcastInterval);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});


// Check required environment variables
const requiredEnvVars = ['ACCESS_SECRET', 'REFRESH_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please create a .env file or set these environment variables');
  console.error('Example .env content:');
  console.error('ACCESS_SECRET=your_access_secret_here');
  console.error('REFRESH_SECRET=your_refresh_secret_here');
  console.error('DB_HOST=localhost');
  console.error('DB_NAME=spacemonitor');
  console.error('DB_USER=root');
  console.error('DB_PASSWORD=');
  process.exit(1);
}

// Start server
server.listen(port, () => {
  console.log(`✅ Server Smart web IoT management started on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT secrets configured: ${process.env.ACCESS_SECRET ? '✅' : '❌'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  
  // Log database connection info
  try {
    const dbConfig = db.pool ? db.pool.config.connectionConfig : db.config.connectionConfig;
    console.log(`🗄️  Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} (${dbConfig.user})`);
  } catch (dbError) {
    console.error('❌ Database configuration error:', dbError.message);
  }
});

