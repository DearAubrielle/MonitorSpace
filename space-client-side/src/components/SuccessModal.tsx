import { useEffect, useId, useRef } from 'react';
import styles from './SuccessModal.module.css';

interface SuccessModalProps {
  title?: string;
  message: string;
  onClose: () => void;
}

export default function SuccessModal({ title = 'All changes saved', message, onClose }: SuccessModalProps) {
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
      <button type="button" className={styles.close} aria-label="Close success dialog" onClick={onClose}>×</button>
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
      </div>
      <h2 id={titleId} className={styles.title}>{title}</h2>
      <p id={descriptionId} className={styles.message}>{message}</p>
      <button type="button" className={styles.continueButton} autoFocus onClick={onClose}>Continue</button>
    </dialog>
  );
}
