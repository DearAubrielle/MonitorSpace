import { useState } from 'react';

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

    const handleSelectCamera = (id: string) => {
        setSelectedCameraId(id === selectedCameraId ? null : id);
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 , justifyContent: 'center', paddingTop: '1rem'}}>
            {cameras.map((camera) => (
                <div
                    key={camera.id}
                    style={{
                        border: '1px solid #ccc',
                        borderRadius: 8,
                        padding: 12,
                        width: 320,
                        boxShadow: selectedCameraId === camera.id ? '0 0 8px #0078d4' : undefined,
                        position: 'relative',
                        background: '#fff',
                    }}
                >
                    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{camera.name}</div>
                    <video
                        src={camera.streamUrl}
                        controls
                        style={{ width: '100%', borderRadius: 4 }}
                    />
                    <button
                        onClick={() => handleSelectCamera(camera.id)}
                        style={{
                            marginTop: 8,
                            background: '#0078d4',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '6px 12px',
                            cursor: 'pointer',
                        }}
                    >
                        {selectedCameraId === camera.id ? 'Hide Details' : 'Show Details'}
                    </button>
                    {selectedCameraId === camera.id && (
                        <div
                            style={{
                                marginTop: 10,
                                padding: 8,
                                background: '#f3f3f3',
                                borderRadius: 4,
                                fontSize: 14,
                            }}
                        >
                            {camera.details}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default MonitorComponent;