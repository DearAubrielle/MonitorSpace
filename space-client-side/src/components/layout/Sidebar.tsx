import { NavLink } from 'react-router';
import { useAuth } from '@/context/useAuth';
import styles from './Sidebar.module.css';


export default function Sidebar() {
  const { user } = useAuth();

  // Define all navigation links
  const allNavLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/floorplan', label: 'Floor Plan' },
    { to: '/device', label: 'Device' },
    { to: '/member', label: 'Member' },
  ];

  // Filter navigation links based on user role
  const getNavLinksForRole = () => {
    if (!user) return [];
    
    if (user.role === 'user') {
      // Regular users only see Dashboard
      return [{ to: '/dashboard', label: 'Dashboard' }];
    } else if (user.role === 'admin') {
      // Admins see all pages
      return allNavLinks;
    }
    
    // Default fallback - show only dashboard
    return [{ to: '/dashboard', label: 'Dashboard' }];
  };

  const navLinks = getNavLinksForRole();
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