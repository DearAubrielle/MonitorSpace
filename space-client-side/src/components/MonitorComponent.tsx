import { useEffect, useMemo, useState } from 'react';
import styles from './MonitorComponent.module.css';

type Camera = { id: string; name: string; streamUrl: string; details: string };
type MonitorComponentProps = { cameras: Camera[] };

const MonitorComponent: React.FC<MonitorComponentProps> = ({ cameras }) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(cameras.filter((camera) => !camera.streamUrl).map((camera) => [camera.id, true]))
  );
  const [retryKeys, setRetryKeys] = useState<Record<string, number>>({});
  const [expandedCamera, setExpandedCamera] = useState<Camera | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    setImageErrors((current) => {
      const next = { ...current };
      cameras.forEach((camera) => { if (!camera.streamUrl) next[camera.id] = true; });
      return next;
    });
  }, [cameras]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!expandedCamera) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpandedCamera(null); };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; };
  }, [expandedCamera]);

  const offlineCount = useMemo(
    () => cameras.filter((camera) => !camera.streamUrl || imageErrors[camera.id]).length,
    [cameras, imageErrors]
  );
  const liveCount = cameras.length - offlineCount;
  const clock = currentTime.toLocaleTimeString('en-GB');

  const retryCamera = (camera: Camera) => {
    if (!camera.streamUrl) return;
    setImageErrors((current) => ({ ...current, [camera.id]: false }));
    setRetryKeys((current) => ({ ...current, [camera.id]: (current[camera.id] ?? 0) + 1 }));
  };

  const takeScreenshot = () => {
    if (!expandedCamera || imageErrors[expandedCamera.id]) return;
    const link = document.createElement('a');
    link.href = expandedCamera.streamUrl;
    link.download = `${expandedCamera.name}_screenshot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className={styles.monitorContainer}>
      <section className={styles.summary} aria-label="Camera status summary">
        <div className={styles.statCard}><strong>{cameras.length}</strong><span>Total cameras</span></div>
        <div className={styles.statCard}><strong className={styles.liveNumber}>{liveCount}</strong><span>Live now</span></div>
        <div className={styles.statCard}><strong className={styles.offlineNumber}>{offlineCount}</strong><span>Offline</span></div>
      </section>

      <div className={styles.cameraGrid}>
        {cameras.map((camera) => {
          const isOffline = !camera.streamUrl || imageErrors[camera.id];
          return (
            <article key={camera.id} className={styles.cameraCard}>
              <div className={styles.cameraPreview}>
                {isOffline ? (
                  <div className={styles.errorPlaceholder}>
                    <strong>Camera unavailable</strong>
                    <span>The stream is currently unreachable</span>
                    <button type="button" className={styles.retryButton} onClick={() => retryCamera(camera)} disabled={!camera.streamUrl}>↻ Try reconnecting</button>
                  </div>
                ) : (
                  <>
                    <img key={retryKeys[camera.id] ?? 0} src={camera.streamUrl} alt={camera.name} className={styles.cameraImage} onLoad={() => setImageErrors((current) => ({ ...current, [camera.id]: false }))} onError={() => setImageErrors((current) => ({ ...current, [camera.id]: true }))} />
                    <span className={styles.liveBadge}><i /> LIVE</span>
                    <time className={styles.feedTime}>{clock}</time>
                    <button type="button" className={styles.expandButton} onClick={() => setExpandedCamera(camera)} aria-label={`Expand ${camera.name}`}>⛶</button>
                  </>
                )}
              </div>
              <div className={styles.cameraInfo}><h3>{camera.name}</h3><p>{camera.details}</p></div>
            </article>
          );
        })}
      </div>

      {expandedCamera && (
        <div className={styles.expandedModal} onClick={() => setExpandedCamera(null)} role="dialog" aria-modal="true">
          <div className={styles.expandedContainer} onClick={(event) => event.stopPropagation()}>
            <div className={styles.expandedVideoContainer}>
              <button type="button" className={styles.closeButton} onClick={() => setExpandedCamera(null)} aria-label="Close expanded view">×</button>
              {imageErrors[expandedCamera.id] ? (
                <div className={styles.expandedErrorPlaceholder}><h3>Camera unavailable</h3><p>This camera stream is currently offline or unreachable.</p><button type="button" className={styles.retryButton} onClick={() => retryCamera(expandedCamera)}>↻ Try reconnecting</button></div>
              ) : (
                <img key={retryKeys[expandedCamera.id] ?? 0} src={expandedCamera.streamUrl} alt={expandedCamera.name} className={styles.expandedImage} onError={() => setImageErrors((current) => ({ ...current, [expandedCamera.id]: true }))} />
              )}
              {!imageErrors[expandedCamera.id] && <><span className={styles.modalLiveBadge}><i /> LIVE</span><div className={styles.overlayActions}><button type="button" onClick={takeScreenshot} title="Take screenshot">▣</button><button type="button" onClick={() => retryCamera(expandedCamera)} title="Refresh feed">↻</button></div><div className={styles.cinematicBar}><div><h2>{expandedCamera.name}</h2><p>{expandedCamera.details} · Secure live stream</p></div><time className={styles.modalTime}>{clock}</time></div></>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitorComponent;
