import { NavLink } from 'react-router';
import { useAuth } from '@/context/useAuth';
import { useFloorplan } from '@/context/useFlooplan';
import { NAVIGATION_ITEMS } from '../../routes/access';
import styles from './Sidebar.module.css';
import { isDeviceAlertActive } from '@/utils/deviceAlert';

export default function Sidebar() {
  const { user } = useAuth();
  const { devices } = useFloorplan();

  const navLinks = user ? NAVIGATION_ITEMS.filter((item) => item.allowedRoles.includes(user.role)) : [];
  const hasActiveAlerts = (devices ?? []).some((device) => isDeviceAlertActive(device));

  return (
    <div className={styles.sidebarContainer}>
      <aside className={styles.sidebar}>
        <ul>
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className={({ isActive }) => (isActive ? styles.activeLink : undefined)}>
                <span>{link.label}</span>
                {link.to === '/dashboard' && hasActiveAlerts && (
                   <span className={styles.alertIcon} aria-hidden="true">!</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
