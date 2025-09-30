// SensorData.tsx
import { useEffect, useRef, useState } from 'react';

type SensorData = {
  temperature: string;
  humidity: string;
  timestamp: string;
};

export default function SensorDataComponent() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/');
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SensorData;
        setSensorData(data);
      } catch {
        console.error('Failed to parse message:', event.data);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      socketRef.current?.close();
      console.log('WebSocket cleanup called');
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


