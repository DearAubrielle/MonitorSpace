const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

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

// Emit data every 2 seconds (simulate sensor data)
setInterval(broadcastSensorData, 2000);

// Start server
server.listen(port, () => {
  console.log(`Server started on port ${port} (HTTP + WebSocket) at http://localhost:${port}`);
});



/* 
function asyncOperation() {

    let counter = 0;

    return function() {

        counter += 1;

        console.log(`Operation called ${counter} times`);

    };

}

const operation = asyncOperation();

operation(); // Output: Operation called 1 times

operation(); // Output: Operation called 2 times

(function() {
    let localVariable = 'I am private';
    console.log(localVariable);
})();
console.log(typeof localVariable); */