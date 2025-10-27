import { useState, useEffect } from 'react';
import styles from './MonitorComponent.module.css';

type Camera = {
    id: string;
    name: string;
    streamUrl: string;
    details: string;
};

type MonitorComponentProps = {
    cameras: Camera[];
};

const MonitorComponent: React.FC<MonitorComponentProps> = ({ cameras }) => {
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [expandedCamera, setExpandedCamera] = useState<Camera | null>(null);

    const handleImageError = (cameraId: string) => {
        setImageErrors(prev => ({ ...prev, [cameraId]: true }));
    };

    const handleCameraClick = (camera: Camera) => {
        setExpandedCamera(camera);
    };

    const handleCloseExpanded = () => {
        setExpandedCamera(null);
    };

    const handleExpandedImageError = () => {
        if (expandedCamera) {
            setImageErrors(prev => ({ ...prev, [expandedCamera.id]: true }));
        }
    };

    const handleRefreshFeed = () => {
        if (expandedCamera) {
            // Reset error state to retry loading the image
            setImageErrors(prev => ({ ...prev, [expandedCamera.id]: false }));
        }
    };

    const handleTakeScreenshot = () => {
        if (expandedCamera && !imageErrors[expandedCamera.id]) {
            // Create a link element to download the current image
            const link = document.createElement('a');
            link.href = expandedCamera.streamUrl;
            link.download = `${expandedCamera.name}_screenshot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && expandedCamera) {
                handleCloseExpanded();
            }
        };

        if (expandedCamera) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [expandedCamera]);

    return (
        <div className={styles.monitorContainer}>
            <div className={styles.cameraGrid}>
                {cameras.map((camera) => (
                    <div
                        key={camera.id}
                        className={styles.cameraCard}
                        onClick={() => handleCameraClick(camera)}
                    >
                        <div className={styles.cameraHeader}>
                            <h3 className={styles.cameraTitle}>{camera.name}</h3>
                            <div className={styles.cameraStatus}>
                                <div className={`${styles.statusDot} ${imageErrors[camera.id] ? styles.offline : styles.online}`}></div>
                                <span className={styles.statusText}>
                                    {imageErrors[camera.id] ? 'Offline' : 'Live'}
                                </span>
                            </div>
                        </div>
                        
                        <div className={styles.cameraPreview}>
                            {imageErrors[camera.id] ? (
                                <div className={styles.errorPlaceholder}>
                                    <div className={styles.errorIcon}>📷</div>
                                    <p>Camera Unavailable</p>
                                </div>
                            ) : (
                                <img
                                    src={camera.streamUrl}
                                    alt={camera.name}
                                    className={styles.cameraImage}
                                    onError={() => handleImageError(camera.id)}
                                />
                            )}
                        </div>

                        <div className={styles.cameraDetails}>
                            <h4>Camera Information</h4>
                            <p>{camera.details}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Expanded Camera Modal */}
            {expandedCamera && (
                <div className={styles.expandedModal} onClick={handleCloseExpanded}>
                    <div className={styles.expandedContainer} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.expandedHeader}>
                            <div className={styles.expandedTitleSection}>
                                <h2 className={styles.expandedTitle}>{expandedCamera.name}</h2>
                                <div className={styles.expandedStatus}>
                                    <div className={`${styles.statusDot} ${imageErrors[expandedCamera.id] ? styles.offline : styles.online}`}></div>
                                    <span className={styles.statusText}>
                                        {imageErrors[expandedCamera.id] ? 'Offline' : 'Live'}
                                    </span>
                                </div>
                            </div>
                            <button 
                                className={styles.closeButton}
                                onClick={handleCloseExpanded}
                                aria-label="Close expanded view"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className={styles.expandedVideoContainer}>
                            {imageErrors[expandedCamera.id] ? (
                                <div className={styles.expandedErrorPlaceholder}>
                                    <div className={styles.expandedErrorIcon}>📷</div>
                                    <h3>Camera Unavailable</h3>
                                    <p>This camera stream is currently offline or unreachable.</p>
                                </div>
                            ) : (
                                <img
                                    src={expandedCamera.streamUrl}
                                    alt={expandedCamera.name}
                                    className={styles.expandedImage}
                                    onError={handleExpandedImageError}
                                />
                            )}
                            
                            {/* Overlay Controls */}
                            <div className={styles.videoOverlay}>
                                <div className={styles.overlayTop}>
                                    <div className={styles.overlayInfo}>
                                        <span className={styles.overlayDetails}>{expandedCamera.details}</span>
                                    </div>
                                </div>
                                
                                <div className={styles.overlayBottom}>
                                    <div className={styles.overlayActions}>
                                        <button 
                                            className={styles.overlayButton}
                                            onClick={handleTakeScreenshot}
                                            disabled={imageErrors[expandedCamera.id]}
                                            title="Take Screenshot"
                                        >
                                            📷
                                        </button>
                                        <button 
                                            className={styles.overlayButton}
                                            onClick={handleRefreshFeed}
                                            title="Refresh Feed"
                                        >
                                            🔄
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonitorComponent;