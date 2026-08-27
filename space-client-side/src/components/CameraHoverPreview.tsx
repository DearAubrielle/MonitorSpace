import { useEffect, useState } from 'react';
import styles from './CameraHoverPreview.module.css';

type CameraHoverPreviewProps = {
  name: string;
  streamUrl: string;
  align?: 'left' | 'right';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export default function CameraHoverPreview({
  name,
  streamUrl,
  align = 'right',
  onMouseEnter,
  onMouseLeave,
}: CameraHoverPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    setImageError(false);
  }, [streamUrl]);

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
          <img src={streamUrl} alt={`Live view from ${name}`} onError={() => setImageError(true)} />
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
