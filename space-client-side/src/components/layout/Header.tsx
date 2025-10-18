import styles from './Header.module.css';
import { useNavigate } from 'react-router';
import { useAuth } from  '@/context/useAuth';

export default function Header(){
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className={styles.stickyHeader}>
      <header>
        <div className={styles.logo}>SpaceMonitor</div>
        <ul>
          <li><b>{user?.username}</b></li>
          <li>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#4c94e0ff', cursor: 'pointer' }}>
              Logout
            </button>
          </li>
        </ul>
      </header>
    </div>
  );
};
