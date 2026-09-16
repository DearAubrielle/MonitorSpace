import { useEffect, useState } from 'react';
import styles from './CameraHoverPreview.module.css';
import CameraStreamImage from './CameraStreamImage';

type CameraHoverPreviewProps = {
  name: string;
  deviceId: string;
  align?: 'left' | 'right';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export default function CameraHoverPreview({
  name,
  deviceId,
  align = 'right',
  onMouseEnter,
  onMouseLeave,
}: CameraHoverPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={`${styles.preview} ${align === 'left' ? styles.alignLeft : styles.alignRight}`}
      role="status"
      aria-label={`Live preview for ${name}`}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.feed}>
        {imageError ? (
          <div className={styles.unavailable}>
            <span>Camera preview unavailable</span>
          </div>
        ) : (
          <CameraStreamImage deviceId={deviceId} alt={`Live view from ${name}`} onStreamError={() => setImageError(true)} />
        )}
        <span className={`${styles.liveBadge} ${imageError ? styles.offlineBadge : ''}`}>
          <span className={styles.liveDot} />
          {imageError ? 'OFFLINE' : 'LIVE'}
        </span>
        <time className={styles.timestamp}>{time.toLocaleTimeString('en-GB')}</time>
      </div>
      <div className={styles.details}>
        <div>
          <strong>{name}</strong>
          <span>Camera device</span>
        </div>
        <span className={styles.openHint}>Click to open →</span>
      </div>
    </div>
  );
}
