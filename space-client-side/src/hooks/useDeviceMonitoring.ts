import { useCallback } from 'react';
import type { Device } from '../types/Device';
import { useWebSocket } from './useWebSocket';

export function useDeviceMonitoring() {
  const { deviceValues, connectionStatus } = useWebSocket({
    url: 'ws://localhost:8080/',
    reconnectAttempts: 5,
    reconnectInterval: 3000,
  });

  const getDeviceValue = useCallback(
    (device: Device) => deviceValues[String(device.id)] ?? device.latest_value,
    [deviceValues]
  );

  const getDeviceAlert = useCallback(
    (device: Device) => {
      const rawValue = getDeviceValue(device);
      const numericValue =
        typeof rawValue === 'number' ? rawValue : Number.parseFloat(String(rawValue));

      if (!Number.isFinite(numericValue)) return false;

      return (
        (device.min_alert !== undefined && numericValue < device.min_alert) ||
        (device.max_alert !== undefined && numericValue > device.max_alert)
      );
    },
    [getDeviceValue]
  );

  return {
    deviceValues,
    connectionStatus,
    getDeviceValue,
    getDeviceAlert,
  };
}
