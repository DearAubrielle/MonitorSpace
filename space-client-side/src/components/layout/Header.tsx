import styles from './Header.module.css';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/useAuth';
import { useFloorplan } from '@/context/useFlooplan';
import { getDeviceIconUrl, handleDeviceIconError } from '@/utils/deviceIcon';
import { isDeviceAlertActive } from '@/utils/deviceAlert';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { devices, deviceTypes, floorplans, setSelected } = useFloorplan();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const initials = user?.username.slice(0, 2).toUpperCase() || 'GU';

  const activeAlerts = useMemo(
    () => (devices ?? []).filter((device) => isDeviceAlertActive(device)),
    [devices]
  );

  const openAlertDevice = (floorplanId: number) => {
    const floorplan = floorplans?.find((plan) => Number(plan.id) === Number(floorplanId));
    if (floorplan) setSelected(floorplan);
    setShowAlerts(false);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.stickyHeader}>
      <header className={styles.header}>
        <div className={styles.logo} aria-label="MonitorSpace">
          <span className={styles.logoMark} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 5.5h14v13H5zM10.3 5.5v5.2H5m8.7 7.8v-5.2H19"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="14.7" cy="9.5" r="1.45" fill="currentColor" />
            </svg>
          </span>
          <span>
            Monitor<span className={styles.logoAccent}>Space</span>
          </span>
        </div>
        <ul>
          {activeAlerts.length > 0 && (
            <li className={styles.alertMenuItem}>
              <button
                className={styles.alertButton}
                onClick={() => setShowAlerts((current) => !current)}
                aria-expanded={showAlerts}
                aria-haspopup="true"
              >
                <span className={styles.alertIcon} aria-hidden="true">!</span>
                <span>Alerts</span>
                <span className={styles.alertCount}>{activeAlerts.length}</span>
              </button>
              {showAlerts && (
                <div className={styles.alertPopover}>
                  <div className={styles.alertPopoverHeader}>
                    <strong>Active alerts</strong>
                    <span>{activeAlerts.length} critical</span>
                  </div>
                  <div className={styles.alertList}>
                  {activeAlerts.map((device) => {
                    const floorplan = floorplans?.find(
                      (plan) => Number(plan.id) === Number(device.floorplan_id)
                    );
                    const deviceType = deviceTypes?.find((type) => type.id === device.device_type_id);
                    return (
                      <button
                        key={device.id}
                        className={styles.alertEntry}
                        onClick={() => openAlertDevice(device.floorplan_id)}
                      >
                        <span className={styles.alertEntryIcon} aria-hidden="true">
                          <img
                            src={getDeviceIconUrl(deviceType?.icon_url)}
                            alt=""
                            onError={handleDeviceIconError}
                          />
                        </span>
                        <span>
                          <strong>{device.name}</strong>
                          <small>
                            {floorplan?.name ?? 'Unknown floor'} · {device.latest_value}
                          </small>
                        </span>
                        <span className={styles.alertEntryArrow} aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                  </div>
                </div>
              )}
            </li>
          )}
          <li>
            <button className={styles.accountButton} onClick={() => navigate('/account')} aria-label="Open your account">
              <span className={styles.accountAvatar} aria-hidden="true">{initials}</span>
              <span className={styles.accountName}>{user?.username || 'Guest'}</span>
              <span className={styles.accountArrow} aria-hidden="true">›</span>
            </button>
          </li>
          <li>
            <button className={styles.logoutButton} onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </li>
        </ul>
      </header>
    </div>
  );
}
