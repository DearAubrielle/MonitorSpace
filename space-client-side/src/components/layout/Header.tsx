import styles from './Header.module.css';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/useAuth';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.stickyHeader}>
      <header>
        <div className={styles.logo}>SpaceMonitor</div>
        <ul>
          <li>
            <b>{user?.username || 'Guest'}</b>
          </li>
          <li>
            <button onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </li>
        </ul>
      </header>
    </div>
  );
}
