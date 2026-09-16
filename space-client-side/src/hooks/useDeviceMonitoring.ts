import { useCallback } from 'react';
import type { Device } from '../types/Device';
import { useWebSocket } from './useWebSocket';
import { isDeviceAlertActive } from '../utils/deviceAlert';

const WS_URL = import.meta.env.VITE_WS_URL;

export function useDeviceMonitoring() {
  const { deviceValues, isConnected, lastMessageAt } = useWebSocket({
    url: WS_URL,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    inactivityTimeout: 20_000,
  });

  const getDeviceValue = useCallback(
    (device: Device) => deviceValues[String(device.id)] ?? device.latest_value,
    [deviceValues]
  );

  const getDeviceAlert = useCallback(
    (device: Device) => isDeviceAlertActive(device, getDeviceValue(device)),
    [getDeviceValue]
  );

  return {
    deviceValues,
    isConnected,
    lastMessageAt,
    getDeviceValue,
    getDeviceAlert,
  };
}
