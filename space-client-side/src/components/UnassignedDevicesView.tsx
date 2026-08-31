import type { Device, DeviceType } from '../types/Device';
import { getDeviceIconUrl, handleDeviceIconError } from '../utils/deviceIcon';
import styles from './UnassignedDevicesView.module.css';

type UnassignedDevicesViewProps = {
  devices: Device[];
  deviceTypes: DeviceType[];
  getDeviceValue?: (device: Device) => string | number | undefined;
  getDeviceAlert?: (device: Device) => boolean;
  onDeviceClick?: (device: Device) => void;
};

export default function UnassignedDevicesView({
  devices,
  deviceTypes,
  getDeviceValue,
  getDeviceAlert,
  onDeviceClick,
}: UnassignedDevicesViewProps) {
  return (
    <section className={styles.view}>
      <header className={styles.header}>
        <div>
          <h3>Unplaced Devices</h3>
          <p>Place these devices on a floor plan to monitor their location.</p>
        </div>
        <span className={styles.count}>{devices.length}</span>
      </header>

      {devices.length > 0 ? (
        <div className={styles.grid}>
          {devices.map((device) => {
            const type = deviceTypes.find((item) => item.id === device.device_type_id);
            const value = getDeviceValue?.(device) ?? device.latest_value;
            const alert = getDeviceAlert?.(device) ?? false;

            return (
              <button
                key={device.id}
                type="button"
                className={`${styles.deviceCard} ${alert ? styles.alertCard : ''}`}
                onClick={() => onDeviceClick?.(device)}
              >
                <span className={styles.iconWrap}>
                  <img
                    src={getDeviceIconUrl(type?.icon_url)}
                    alt=""
                    onError={handleDeviceIconError}
                  />
                </span>
                <span className={styles.details}>
                  <strong>{device.name}</strong>
                  <small>{type?.name ?? 'Device'}</small>
                </span>
                {value !== undefined && value !== null && value !== '' && (
                  <span className={styles.value}>
                    {value}{type?.unit ? ` ${type.unit}` : ''}
                  </span>
                )}
                {alert && <span className={styles.alertBadge}>Alert</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span aria-hidden="true">✓</span>
          <strong>All devices are assigned</strong>
          <p>New unassigned devices will appear here.</p>
        </div>
      )}
    </section>
  );
}
