import { NavLink } from 'react-router';
import { useAuth } from '@/context/useAuth';
import { NAVIGATION_ITEMS } from '../../routes/access';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { user } = useAuth();

  const navLinks = user ? NAVIGATION_ITEMS.filter((item) => item.allowedRoles.includes(user.role)) : [];

  return (
    <div className={styles.sidebarContainer}>
      <aside className={styles.sidebar}>
        <ul>
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className={({ isActive }) => (isActive ? styles.activeLink : undefined)}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
