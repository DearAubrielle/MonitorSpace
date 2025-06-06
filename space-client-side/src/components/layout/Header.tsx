import styles from './Header.module.css';

const Header: React.FC = () => {
  return (
    <div className={styles.stickyHeader}>
    <header>
      <div className={styles.logo}>SpaceMonitor</div>
      <ul>
        <li><a href="#services">Services</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </header>
    </div>
  );
};

export default Header;