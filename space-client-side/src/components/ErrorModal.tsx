import { useEffect, useId, useRef } from 'react';
import styles from './SuccessModal.module.css';

interface ErrorModalProps {
  title?: string;
  message: string;
  onClose: () => void;
}

export default function ErrorModal({ title = 'Unable to update', message, onClose }: ErrorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !message) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [message]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
      aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <button type="button" className={styles.close} aria-label="Close error dialog" onClick={onClose}>×</button>
      <div className={`${styles.icon} ${styles.errorIcon}`} aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 6v7m0 4h.01" /></svg>
      </div>
      <h2 id={titleId} className={styles.title}>{title}</h2>
      <p id={descriptionId} className={styles.message}>{message}</p>
      <button type="button" className={styles.continueButton} autoFocus onClick={onClose}>Back to editing</button>
    </dialog>
  );
}
