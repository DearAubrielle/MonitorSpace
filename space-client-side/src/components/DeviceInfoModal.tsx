import Modal from './Modal';
import type { Device, DeviceType } from '../types/Device';
import { getDeviceIconUrl, handleDeviceIconError } from '../utils/deviceIcon';
import styles from './DeviceInfoModal.module.css';

interface DeviceInfoModalProps {
  device: Device | null;
  deviceTypes?: DeviceType[] | null;
  deviceValues: Record<string, number>;
  onClose: () => void;
}

function formatValue(value: unknown): { formatted: string; isValid: boolean } {
  if (value === null || value === undefined || value === '') return { formatted: 'N/A', isValid: false };

  const numValue = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isNaN(numValue)
    ? { formatted: String(value) || 'N/A', isValid: false }
    : { formatted: numValue.toFixed(2), isValid: true };
}

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) return 'Never updated';

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return 'Never updated';

  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DeviceInfoModal({ device, deviceTypes, deviceValues, onClose }: DeviceInfoModalProps) {
  if (!device) return null;

  const deviceType = deviceTypes?.find((type) => type.id === device.device_type_id);
  const currentValue = formatValue(deviceValues[device.id] ?? device.latest_value);
  const unit = deviceType?.unit ?? '';
  const isCamera = deviceType?.name.toLowerCase() === 'camera';
  const minAlert = formatValue(device.min_alert);
  const maxAlert = formatValue(device.max_alert);
  const currentNumber = currentValue.isValid ? Number.parseFloat(currentValue.formatted) : null;
  const isAlert =
    !isCamera &&
    currentNumber !== null &&
    ((minAlert.isValid && currentNumber < Number.parseFloat(minAlert.formatted)) ||
      (maxAlert.isValid && currentNumber > Number.parseFloat(maxAlert.formatted)));

  const thresholdText = (value: { formatted: string; isValid: boolean }) =>
    value.isValid ? `${value.formatted}${unit ? ` ${unit}` : ''}` : 'Not set';

  return (
    <Modal open style={{ width: 'min(460px, calc(100vw - 32px))', maxWidth: 'none', padding: 0 }}>
      <article className={styles.modalContent} aria-labelledby="device-detail-title">
        <header className={styles.header}>
          <div className={styles.identity}>
            <span className={`${styles.iconWrap} ${isAlert ? styles.iconAlert : ''}`} aria-hidden="true">
              <img src={getDeviceIconUrl(deviceType?.icon_url)} alt="" onError={handleDeviceIconError} />
            </span>
            <div className={styles.headingText}>
              <span className={styles.eyebrow}>{deviceType?.name || 'Device'}</span>
              <h2 id="device-detail-title" className={styles.title}>
                {device.name}
              </h2>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close device details">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {!isCamera && (
          <section className={`${styles.readingCard} ${isAlert ? styles.readingAlert : ''}`}>
            <div>
              <p className={styles.sectionLabel}>Current reading</p>
              <div className={styles.readingValue}>
                <span>{currentValue.isValid ? currentValue.formatted : 'No data'}</span>
                {currentValue.isValid && unit && <span className={styles.readingUnit}>{unit}</span>}
              </div>
            </div>
            <span className={`${styles.statusBadge} ${isAlert ? styles.statusAlert : styles.statusNormal}`}>
              <span className={styles.statusDot} aria-hidden="true" />
              {isAlert ? 'Alert' : 'Normal'}
            </span>
          </section>
        )}

        <section className={styles.details} aria-label="Device information">
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Last updated</span>
            <span className={styles.detailValue}>{formatUpdatedAt(device.last_updated)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Device type</span>
            <span className={styles.detailValue}>{deviceType?.name || 'Unknown'}</span>
          </div>
          {isCamera && device.path_topic && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Camera URL</span>
              <span className={`${styles.detailValue} ${styles.urlValue}`} title={device.path_topic}>
                {device.path_topic}
              </span>
            </div>
          )}
        </section>

        {!isCamera && (
          <section className={styles.thresholdSection} aria-labelledby="alert-range-title">
            <div className={styles.sectionHeading}>
              <h3 id="alert-range-title">Alert range</h3>
              <span>Configured thresholds</span>
            </div>
            <div className={styles.thresholdGrid}>
              <div className={styles.thresholdCard}>
                <span>Minimum</span>
                <strong>{thresholdText(minAlert)}</strong>
              </div>
              <div className={styles.thresholdCard}>
                <span>Maximum</span>
                <strong>{thresholdText(maxAlert)}</strong>
              </div>
            </div>
          </section>
        )}

        <footer className={styles.footer}>
          <span className={styles.deviceId}>Device ID #{device.id}</span>
          <button className={styles.doneButton} onClick={onClose}>
            Done
          </button>
        </footer>
      </article>
    </Modal>
  );
}
