import { useState } from 'react';
import { Navigate, NavLink } from 'react-router';
import { useAuth } from '../context/useAuth';
import styles from './Login.module.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [redirect, setRedirect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username, password);
      setRedirect(true);
    } catch {
      setError('Unable to sign in. Check your username and password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (redirect) return <Navigate to="/dashboard" replace />;

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <NavLink className={styles.brand} to="/" aria-label="MonitorSpace home">
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
          <form className={styles.card} onSubmit={handleSubmit}>
            <NavLink className={styles.backLink} to="/">
              <span aria-hidden="true">←</span> Back to home
            </NavLink>
            <h1>Welcome back</h1>
            <p className={styles.intro}>Sign in to monitor your spaces and manage floor plans.</p>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <div className={styles.workspaceNote}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M8 8h3v3H8zM14 8h2M14 11h2M8 15h8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Continue to your monitoring workspace
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
