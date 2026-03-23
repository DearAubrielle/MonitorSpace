import styles from './Header.module.css';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/useAuth';

export default function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    navigate('/login');
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
            <button onClick={handleLogout}>Logout</button>
          </li>
        </ul>
      </header>
    </div>
  );
}
