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
      // Development origins
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      // Environment-based origins
      process.env.CLIENT_URL,
      // Production URLs
      'https://monitorspace.onrender.com',
      'https://monitorspaceflow.onrender.com'
    ].filter(Boolean);

    console.log(`CORS Check - Request Origin: ${origin}`);
    console.log(`CORS Check - Allowed Origins:`, allowedOrigins);

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      console.log('CORS - No origin header, allowing request');
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`CORS - Origin ${origin} is allowed`);
      callback(null, true);
    } else {
      console.log(`CORS - Origin ${origin} is NOT allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false
};
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);
app.use(cookieParser());

// Add CORS debugging
app.use((req, res, next) => {
  console.log(`CORS - Origin: ${req.get('Origin')}`);
  console.log(`CORS - Method: ${req.method}`);
  next();
});

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json({ limit: "10mb" }));


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    origin: req.get('Origin'),
    corsEnabled: true
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


// --- Send all device latest values every 2s ---
setInterval(async () => {
  try {
    const [rows] = await db.query(
      "SELECT id, latest_value FROM devices"
    );
    broadcast(rows); // send all devices in one packet
    //console.log("Broadcasted device values");
  } catch (err) {
    console.error("DB error:", err);
  }
}, 2000);


// Start server
server.listen(port, () => {
  console.log(`Server Smart web IoT management started on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CLIENT_URL: ${process.env.CLIENT_URL || 'Not set'}`);
  console.log(`PRODUCTION_CLIENT_URL: ${process.env.PRODUCTION_CLIENT_URL || 'Not set'}`);
  
  // Log database connection info
  const dbConfig = db.pool ? db.pool.config.connectionConfig : db.config.connectionConfig;
  console.log(`Database running on ${dbConfig.host}, database: ${dbConfig.database}, user: ${dbConfig.user}`);
});

