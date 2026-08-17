import { useEffect, useState } from 'react';
import styles from './Account.module.css';

interface AccountProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  display_name?: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function Account() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No authentication token found.');

        const response = await fetch(`${SERVER_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || 'Unable to load your account.');
        setProfile(data);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Unable to load your account.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFormError(null);
    setSuccessMessage(null);
  };

  const openPasswordModal = () => {
    resetPasswordForm();
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    if (isSubmitting) return;
    setIsPasswordModalOpen(false);
    resetPasswordForm();
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found.');

      const response = await fetch(`${SERVER_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Unable to update your password.');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage(data?.message || 'Password updated successfully.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleClass = (role: string) => {
    if (role === 'admin') return styles.roleAdmin;
    if (role === 'manager') return styles.roleManager;
    if (role === 'user') return styles.roleUser;
    return styles.roleDefault;
  };

  const roleLabel = profile?.display_name || (profile ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : '');
  const initials = profile?.username.slice(0, 2).toUpperCase() || '';
  

  if (loading) return <div className={styles.state}>Loading your account…</div>;
  if (pageError || !profile) return <div className={`${styles.state} ${styles.errorState}`}>{pageError || 'Account not found.'}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>Account</div>
      <h1 className={styles.title}>Your Profile</h1>
      <p className={styles.lead}>Account information and sign-in security.</p>

      <section className={styles.profileCard}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.profileIdentity}>
          <h2>{profile.username}</h2>
          <p>{profile.email}</p>
        </div>
        <span className={styles.signedIn}>Signed in</span>
      </section>

      <div className={styles.dashboard}>
        <section className={styles.card}>
          <h2>Account Information</h2>
          <div className={styles.infoRow}><span>Username</span><strong>{profile.username}</strong></div>
          <div className={styles.infoRow}><span>Email</span><strong>{profile.email}</strong></div>
          <div className={styles.infoRow}>
            <span>Role</span>
            <span className={`${styles.roleBadge} ${getRoleClass(profile.role)}`}>{roleLabel}</span>
          </div>
        </section>

        <section className={`${styles.card} ${styles.securityCard}`}>
          <div>
            <h2>Password &amp; Security</h2>
            <p>Update your password and protect your account.</p>
          </div>
          <div className={styles.passwordSetting}>
            <span className={styles.keyIcon} aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="11" cy="14" r="6" stroke="currentColor" strokeWidth="2.2" />
                <path d="m15.7 17.7 10.8 10.8m-4-4 2.5-2.5m-5.7.5 2.5-2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className={styles.passwordLabel}><strong>Password</strong><span>••••••••••••</span></span>
            <button type="button" className={styles.changeButton} onClick={openPasswordModal}>Change</button>
          </div>
        </section>
      </div>

      {isPasswordModalOpen && (
        <div className={styles.modalOverlay} onClick={closePasswordModal}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="password-title" onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div><h2 id="password-title">Reset Password</h2><p>Confirm your identity before updating your password.</p></div>
              <button type="button" className={styles.closeButton} onClick={closePasswordModal} disabled={isSubmitting} aria-label="Close">×</button>
            </header>

            {successMessage ? (
              <div className={styles.successBody} role="status"><span>✓</span><div><strong>{successMessage}</strong><p>Your new password will be used the next time you sign in.</p></div></div>
            ) : (
              <form id="password-form" className={styles.form} onSubmit={handlePasswordSubmit}>
                {formError && <div className={styles.formError} role="alert">{formError}</div>}
                <label><span>Current password</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required disabled={isSubmitting} /></label>
                <label><span>New password</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required disabled={isSubmitting} /><small>Use at least 8 characters.</small></label>
                <label><span>Confirm new password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required disabled={isSubmitting} /></label>
              </form>
            )}

            <footer className={styles.modalFooter}>
              {successMessage ? (
                <button type="button" className={styles.primaryButton} onClick={closePasswordModal}>Done</button>
              ) : (
                <><button type="button" className={styles.cancelButton} onClick={closePasswordModal} disabled={isSubmitting}>Cancel</button><button type="submit" form="password-form" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? 'Updating…' : 'Update Password'}</button></>
              )}
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
