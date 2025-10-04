import styles from './dashboard.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import MonitorPage from './MonitorPage';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

interface Device {
  id: string;
  name: string;
  device_type_id: number;
  floorplan_id: number;
  x_percent: number; // 0 to 1
  y_percent: number; // 0 to 1
  latest_value: number; // New field for latest sensor value
}
interface DeviceType {
  id: number;
  name: string;
  image_url: string;
  has_value?: number;
}
interface floorplan {
  id: number;
  name: string;
  image_url: string;
  description: string;
}
interface DevicesBoxProps {
  id: string;
  label: string;
  position: PercentPosition;
  containerWidth: number;
  containerHeight: number;
  iconURL?: string;
  onClick?: () => void;
}
// Type for box position as percentage
type PercentPosition = {
  x: number; // 0 to 1
  y: number; // 0 to 1
};
// Box size as a percentage of container size
const BOX_SIZE_PERCENT = 0.07;

// Minimum and maximum box size in pixels
const MIN_BOX_SIZE = 20;
const MAX_BOX_SIZE = 40;
const DeviceItem: React.FC<DevicesBoxProps> = ({
  label,
  position,
  containerWidth,
  containerHeight,
  iconURL,
  onClick,
}) => {
  // Box size is always square, clamped between MIN_BOX_SIZE and MAX_BOX_SIZE
  const boxSize = Math.max(
    MIN_BOX_SIZE,
    Math.min(
      Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT,
      MAX_BOX_SIZE
    )
  );

  // Convert percent to px for rendering
  const left = position.x * (containerWidth - boxSize);
  const top = position.y * (containerHeight - boxSize);

  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left,
    width: boxSize,
    height: boxSize,
    fontSize: '12px',
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    backgroundImage: iconURL ? `url(${iconURL})` : undefined,
    backgroundSize: "cover", // or 'cover' if you want it filled
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '20%',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.64)',
    cursor: 'grab',
    margin: 0,
    padding: "5px",
  };
  return (
    <div
      style={style}
      onPointerUp={onClick} // <-- use onPointerUp instead of onClick
    >
    </div>
  );
};

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [floorplans, setFloorplans] = useState<floorplan[]>([]);
  const [selected, setSelected] = useState<floorplan | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceValues, setDeviceValues] = useState<Record<string, number>>({});
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [modalDevice, setModalDevice] = useState<Device | null>(null);

  // Fetch floorplans from backend and set the first as selected
  useEffect(() => {
    const fetchFloorplans = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/floorplans/getf`);
        const data = await response.json();
        setFloorplans(data);
        if (data && data.length > 0) {
          setSelected(data[0]);
        }
      } catch (error) {
        console.error('Error fetching floorplans:', error);
      }
    };

    fetchFloorplans();
  }, []);

  // Fetch all devices from backend
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/devices/getd`);
        const data = await response.json();
        setDevices(data);
      } catch (error) {
        console.error('Error fetching devices:', error);
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/');

    socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  let updates: { id: string; latest_value: number }[] = [];

  if (Array.isArray(data)) {
    updates = data;
  } else if (data && typeof data === "object") {
    updates = [data]; // wrap single update in array
  }

  const mapped = updates.reduce((acc: Record<string, number>, d) => {
    acc[d.id] = d.latest_value;
    return acc;
  }, {});

  setDeviceValues((prev) => ({ ...prev, ...mapped }));
};
    
  }, []);

  // When selected floorplan changes, load its image and set container size
  useEffect(() => {
    if (selected) {
      const img = new window.Image();
      img.onload = () => {
        setContainerSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = SERVER_URL + selected.image_url;
    }
  }, [selected]);
  useEffect(() => {
    fetch(`${SERVER_URL}/api/devices/gettypes`)
      .then((res) => res.json())
      .then((data) => setDeviceTypes(data));
  }, []);

  // Update rendered size on window resize for responsive layout
  const [renderedSize, setRenderedSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setRenderedSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [containerSize.width, containerSize.height]);

  // Store device positions separately for drag state
  const [devicePositions, setDevicePositions] = useState<
    Record<string, PercentPosition>
  >({});

  // Update devicePositions when devices or selected floorplan changes
  useEffect(() => {
    if (!selected) return;
    const filtered = devices.filter((d) => d.floorplan_id === selected.id);
    const positions: Record<string, PercentPosition> = {};
    filtered.forEach((device) => {
      positions[device.id] = { x: device.x_percent, y: device.y_percent };
    });
    setDevicePositions(positions);
  }, [devices, selected]);

  return (
    <div style={{ padding: '1rem' }}>
      <h3>House Monitor Dashboard</h3>
      <p>Welcome to your house monitoring dashboard.</p>

      <div className={styles.BreifingWrapper}>
        <div className={styles.selectionbar}>
          <div className={styles.FloorList}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {floorplans.map((plan) => (
                <li
                  key={plan.id}
                  onClick={() => setSelected(plan)}
                  className={`${styles.List} ${selected?.id === plan.id ? styles.Selected : styles.Unselected}`}
                >
                  {plan.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.FloorPlan}>
            {selected && (
              <div ref={containerRef} style={{ width: '100%' }}>
                <AspectRatioBox
                  originalWidth={containerSize.width}
                  originalHeight={containerSize.height}
                  backgroundImage={SERVER_URL + selected.image_url}
                  maxWidth="100%"
                >
                  {devices
                    .filter((device) => Number(device.floorplan_id) === Number(selected?.id))
                    .map((device) => {
                      const type = deviceTypes.find(
                        (t) => t.id === device.device_type_id
                      );
                      const icon = type
                        ? SERVER_URL + type.image_url
                        : '/icons/default.png';
                      return (
                        <DeviceItem
                          key={device.id}
                          id={device.id}
                          label={device.name}
                          iconURL={icon}
                          position={
                            devicePositions[device.id] || {
                              x: device.x_percent,
                              y: device.y_percent,
                            }
                          }
                          containerWidth={renderedSize.width}
                          containerHeight={renderedSize.height}
                          onClick={() =>  
                            setModalDevice(device)
                          }
                        />
                      );
                    })}
                </AspectRatioBox>
              </div>
            )}
          </div>
        </div>
        
        
      </div>
      <h3>Camera Monitor</h3>
      <div className={styles.camera}>
          
          <MonitorPage />
        </div>
      {/* Add widgets/components for temperature, humidity, security, etc. */}
      <div>
        {modalDevice && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: '#fff',
                padding: 24,
                borderRadius: 8,
                minWidth: 300,
              }}
            >
              <h3>Device Info</h3>
              <div>
                <b>Name:</b> {modalDevice.name}
              </div>
              <div>
                <b>ID:</b> {modalDevice.id}
              </div>
               
              <div>
                <b>Latest Value:</b> {deviceValues[modalDevice.id] ?? modalDevice.latest_value}
              </div>
              <button
                onClick={() => setModalDevice(null)}
                style={{ marginTop: 16 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
