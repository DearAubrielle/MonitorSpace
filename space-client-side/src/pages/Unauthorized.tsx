import { NavLink, useNavigate } from 'react-router';
import styles from './Unauthorized.module.css';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <NavLink className={styles.brand} to="/dashboard" aria-label="MonitorSpace dashboard">
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
          </NavLink>
        </header>

        <main className={styles.main}>
          <section className={styles.content}>
            <div className={styles.lockIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.eyebrow}>Access restricted</div>
            <h1>You don’t have access to this page</h1>
            <p>Your account does not have the required permission. Return to an area available to your role.</p>
            <div className={styles.actions}>
              <button className={styles.backAction} type="button" onClick={() => navigate(-1)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m10 7-5 5 5 5M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Go back
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
