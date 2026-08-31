import { useEffect, useState, useCallback, useRef } from 'react';

interface DeviceUpdate {
  id: string;
  latest_value: number | string;
}

interface UseWebSocketOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  inactivityTimeout?: number;
}

export function useWebSocket({
  url,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  inactivityTimeout = 20_000,
}: UseWebSocketOptions) {
  const [deviceValues, setDeviceValues] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnected(false);

    try {
      const socket = new WebSocket(url);

      const resetInactivityTimeout = () => {
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
        }

        inactivityTimeoutRef.current = setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            console.warn('WebSocket received no data; reconnecting...');
            socket.close();
          }
        }, inactivityTimeout);
      };

      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;
        resetInactivityTimeout();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          let updates: DeviceUpdate[] = [];

          if (Array.isArray(data)) {
            updates = data.filter((item) => item && typeof item === 'object' && 'id' in item && 'latest_value' in item);
            setLastMessageAt(Date.now());
            resetInactivityTimeout();
          } else if (data && typeof data === 'object' && 'id' in data && 'latest_value' in data) {
            updates = [data];
            setLastMessageAt(Date.now());
            resetInactivityTimeout();
          }

          const mapped = updates.reduce((acc: Record<string, number>, d) => {
            // Ensure the value is a valid number
            const value =
              typeof d.latest_value === 'number'
                ? d.latest_value
                : typeof d.latest_value === 'string'
                  ? parseFloat(d.latest_value)
                  : null;

            if (value !== null && !isNaN(value) && typeof d.id === 'string') {
              acc[d.id] = value;
            }
            return acc;
          }, {});

          if (Object.keys(mapped).length > 0) {
            setDeviceValues((prev) => ({ ...prev, ...mapped }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
          inactivityTimeoutRef.current = null;
        }
        setIsConnected(false);
        socketRef.current = null;

        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts})...`);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [url, reconnectAttempts, reconnectInterval, inactivityTimeout]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    deviceValues,
    isConnected,
    lastMessageAt,
  };
}
