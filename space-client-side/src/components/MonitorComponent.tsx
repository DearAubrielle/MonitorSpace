import { useState } from 'react';
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
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    const handleSelectCamera = (id: string) => {
        setSelectedCameraId(id === selectedCameraId ? null : id);
    };

    const handleImageError = (cameraId: string) => {
        setImageErrors(prev => ({ ...prev, [cameraId]: true }));
    };

    return (
        <div className={styles.monitorContainer}>
            <div className={styles.cameraGrid}>
                {cameras.map((camera) => (
                    <div
                        key={camera.id}
                        className={`${styles.cameraCard} ${
                            selectedCameraId === camera.id ? styles.cameraCardSelected : ''
                        }`}
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

                        <div className={styles.cameraActions}>
                            <button
                                onClick={() => handleSelectCamera(camera.id)}
                                className={`${styles.detailsButton} ${
                                    selectedCameraId === camera.id ? styles.detailsButtonActive : ''
                                }`}
                            >
                                {selectedCameraId === camera.id ? 'Hide Details' : 'Show Details'}
                            </button>
                        </div>

                        {selectedCameraId === camera.id && (
                            <div className={styles.cameraDetails}>
                                <h4>Camera Information</h4>
                                <p>{camera.details}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MonitorComponent;