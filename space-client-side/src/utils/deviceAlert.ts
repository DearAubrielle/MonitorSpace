import type { Device } from '../types/Device';

export function isDeviceAlertActive(
  device: Device,
  rawValue: string | number | null | undefined = device.latest_value
): boolean {
  if (!device.alert || rawValue === null || rawValue === undefined || rawValue === '') return false;

  const value = typeof rawValue === 'number' ? rawValue : Number.parseFloat(rawValue);
  if (!Number.isFinite(value)) return false;

  return (
    (device.min_alert != null && value < device.min_alert) ||
    (device.max_alert != null && value > device.max_alert)
  );
}
