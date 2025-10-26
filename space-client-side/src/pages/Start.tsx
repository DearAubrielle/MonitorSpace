import { NavLink } from 'react-router';
import styles from './Start.module.css';

export default function Start() {
    return (
        <div className={styles['start-container']}>
            <div className={styles['hero-section']}>
                <div className={styles['content-wrapper']}>
                    <div className={styles['logo-section']}>
                        <div className={styles.logo}>
                            <span className={styles['logo-icon']}>⬢</span>
                            <span className={styles['logo-text']}>MonitorSpace</span>
                        </div>
                    </div>
                    
                    <div className={styles['hero-content']}>
                        <h1 className={styles['hero-title']}>
                            Monitor Your Space
                            <span className={styles['hero-subtitle']}>Effectively</span>
                        </h1>
                        <p className={styles['hero-description']}>
                            Keep track of your environment with real-time monitoring, 
                            smart analytics, and intuitive floor plan management.
                        </p>
                    </div>

                    <div className={styles['action-buttons']}>
                        <NavLink to="/register" className={`${styles.btn} ${styles['btn-primary']}`}>
                            Get Started
                        </NavLink>
                        <NavLink to="/login" className={`${styles.btn} ${styles['btn-secondary']}`}>
                            Sign In
                        </NavLink>
                    </div>

                    <div className={styles['features-preview']}>
                        <div className={styles['feature-item']}>
                            <div className={styles['feature-icon']}>⬜</div>
                            <span>Floor Plans</span>
                        </div>
                        <div className={styles['feature-item']}>
                            <div className={styles['feature-icon']}>📺</div>
                            <span>Real-time Data</span>
                        </div>
                        <div className={styles['feature-item']}>
                            <div className={styles['feature-icon']}>🔧</div>
                            <span>Device Management</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}