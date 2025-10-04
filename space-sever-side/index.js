const express = require("express");
const cors = require("cors");


const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const dotenv = require("dotenv");

const db = require('./db'); // Make sure this is at the top if not already
dotenv.config();


const app = express();
const port = 8080;
const usersRoutes = require("./routes/users");
const floorplansRoutes = require("./routes/floorplans");


const corsOptions = {
  origin: ["http://localhost:5173"],
};

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

// Dummy sensor data generator (replace with real sensor reading)
function getSensorData() {
  return {
    temperature: (20 + Math.random() * 5).toFixed(2),
    humidity: (30 + Math.random() * 10).toFixed(2),
    timestamp: new Date().toISOString()
  };
}

// Broadcast data to all connected clients
function broadcastSensorData() {
  const data = JSON.stringify(getSensorData());
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

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

