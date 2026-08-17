import styles from './Header.module.css';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/useAuth';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = user?.username.slice(0, 2).toUpperCase() || 'GU';

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
