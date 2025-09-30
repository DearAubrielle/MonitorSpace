import styles from './Header.module.css';
import { useNavigate } from 'react-router';

export default function Header(){
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={styles.stickyHeader}>
      <header>
        <div className={styles.logo}>SpaceMonitor</div>
        <ul>
          <li><a href="#services">Username</a></li>
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
