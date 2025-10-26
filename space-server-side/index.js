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
  origin: [process.env.CLIENT_URL || "http://localhost:5173"],
  credentials: true,
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
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));


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
    console.log("Broadcasted device values");
  } catch (err) {
    console.error("DB error:", err);
  }
}, 2000);


// Start server
server.listen(port, () => {
  console.log(`Server started on port ${port} (HTTP + WebSocket) at http://localhost:${port}`);
  // Log database connection info
  const dbConfig = db.pool ? db.pool.config.connectionConfig : db.config.connectionConfig;
  console.log(`Database running on ${dbConfig.host}, database: ${dbConfig.database}, user: ${dbConfig.user}`);

});

