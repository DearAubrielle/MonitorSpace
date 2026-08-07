import { NavLink } from 'react-router';
import styles from './Start.module.css';

function Brand() {
  return (
    <div className={styles.brand} aria-label="MonitorSpace">
      <span className={styles.brandMark} aria-hidden="true">
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
        Monitor<span className={styles.brandAccent}>Space</span>
      </span>
    </div>
  );
}

export default function Start() {
  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <Brand />
        </header>

        <main className={styles.main}>
          <section className={styles.hero}>
            <h1 className={styles.title}>
              Monitor Your Space
              <span>Effectively</span>
            </h1>
            <p className={styles.description}>
              Monitor environmental conditions, view real-time sensor data, and manage devices through interactive
              floor plans.
            </p>

            <NavLink className={styles.signInButton} to="/login">
              Sign in
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14m-5-5 5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </NavLink>

            <div className={styles.features} aria-label="MonitorSpace capabilities">
              <div className={styles.feature}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <span className={styles.sensorValue}>23°</span>
                </span>
                <span>Live environmental data</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 5h16v14H4zM9 5v6H4m9 8v-5h7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Visual floor plan monitoring</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M9 8h6M9 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <span>Simple device management</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
