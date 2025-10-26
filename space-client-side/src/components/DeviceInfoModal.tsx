import Modal from './Modal';
import type { Device, DeviceType } from '../types/Device';
import styles from './DeviceInfoModal.module.css';

interface DeviceInfoModalProps {
  device: Device | null;
  deviceTypes?: DeviceType[] | null;
  deviceValues: Record<string, number>;
  onClose: () => void;
}

// Utility function to safely format numeric values
function formatValue(value: unknown): { formatted: string; isValid: boolean } {
  if (value === null || value === undefined) {
    return { formatted: 'N/A', isValid: false };
  }

  const numValue =
    typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(numValue)) {
    return { formatted: String(value) || 'N/A', isValid: false };
  }

  return { formatted: numValue.toFixed(2), isValid: true };
}

export default function DeviceInfoModal({
  device,
  deviceTypes,
  deviceValues,
  onClose,
}: DeviceInfoModalProps) {
  if (!device) return null;

  const deviceType = deviceTypes?.find((t) => t.id === device.device_type_id);
  const rawValue = deviceValues[device.id] ?? device.latest_value;
  const currentValueInfo = formatValue(rawValue);
  const unit = deviceType?.unit ? ` ${deviceType.unit}` : '';

  // Check if this is a camera device (hide certain fields for cameras)
  const isCamera = deviceType?.name === 'Camera';

  // Determine alert status - only if we have a valid number and it's not a camera
  const currentNumValue = currentValueInfo.isValid
    ? parseFloat(currentValueInfo.formatted)
    : null;
  const isAlert =
    !isCamera &&
    currentNumValue !== null &&
    ((device.min_alert !== undefined && currentNumValue < device.min_alert) ||
      (device.max_alert !== undefined && currentNumValue > device.max_alert));

  return (
    <Modal open={!!device} style={{ maxWidth: '500px' }}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h3 className={styles.title}>{device.name}</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className={styles.deviceInfo}>
          {!isCamera && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Value:</span>
              <span
                className={`${styles.value} ${isAlert ? styles.alertValue : ''}`}
              >
                {currentValueInfo.formatted}
                {currentValueInfo.isValid ? unit : ''}
                {isAlert && <span className={styles.alertBadge}>!</span>}
              </span>
            </div>
          )}

          {!isCamera && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Last Updated:</span>
              <span className={styles.value}>
                {(() => {
                  if (!device.last_updated || device.last_updated === null) {
                    return 'Never updated';
                  }
                  try {
                    const date = new Date(device.last_updated);
                    // Check if the date is valid and not the Unix epoch (1970)
                    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
                      return 'Never updated';
                    }
                    return date.toLocaleString();
                  } catch {
                    return 'Never updated';
                  }
                })()}
              </span>
            </div>
          )}

          <div className={styles.infoRow}>
            <span className={styles.label}>Type:</span>
            <span className={styles.value}>
              {deviceType?.name || 'Unknown'}
            </span>
          </div>

          {isCamera && device.path_topic && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Camera URL:</span>
              <span className={styles.value} title={device.path_topic}>
                {device.path_topic.length > 40
                  ? `${device.path_topic.substring(0, 40)}...`
                  : device.path_topic}
              </span>
            </div>
          )}

          {!isCamera && device.min_alert !== undefined && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Min Alert:</span>
              <span className={styles.value}>
                {(() => {
                  const minAlertInfo = formatValue(device.min_alert);
                  return (
                    minAlertInfo.formatted + (minAlertInfo.isValid ? unit : '')
                  );
                })()}
              </span>
            </div>
          )}

          {!isCamera && device.max_alert !== undefined && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Max Alert:</span>
              <span className={styles.value}>
                {(() => {
                  const maxAlertInfo = formatValue(device.max_alert);
                  return (
                    maxAlertInfo.formatted + (maxAlertInfo.isValid ? unit : '')
                  );
                })()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
