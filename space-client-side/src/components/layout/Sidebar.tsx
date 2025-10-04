import { NavLink } from 'react-router';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/floorplanpage', label: 'Floor Plans' },
    { to: '/device', label: 'Devices' },
    { to: '/member', label: 'Members' },
    { to: '/watage', label: ' ___________________ ' },
    { to: '/monitor', label: 'Monitor' },
    { to: '/sensordata', label: 'Sensor Data' },
    { to: '/googogaga', label: 'CCTV' },
  ];
  return (
    <div className={styles.sidebarContainer}>
      <aside className={styles.sidebar}>
        <ul>
          {navLinks.map((link, index) => (
            <li key={index}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  isActive ? styles.activeLink : undefined
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};