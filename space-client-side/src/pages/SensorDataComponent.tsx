// SensorData.tsx
import { useEffect, useState } from 'react';

type SensorData = {
  temperature: string;
  humidity: string;
  timestamp: string;
};

export default function SensorDataComponent() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);

  useEffect(() => {
    // Connect to the correct WebSocket port (8080)
    const socket = new WebSocket('ws://localhost:8080');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as SensorData;
      setSensorData(data);
    };

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div>
      <h2>Real-Time Sensor Data</h2>
      {sensorData ? (
        <div>
          <p>Temperature: {sensorData.temperature} °C</p>
          <p>Humidity: {sensorData.humidity} %</p>
          <p>Timestamp: {sensorData.timestamp}</p>
        </div>
      ) : (
        <p>Waiting for data...</p>
      )}
    </div>
  );
}


