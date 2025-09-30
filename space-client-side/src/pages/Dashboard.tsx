import styles from './dashboard.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import MonitorPage from './MonitorPage';
import SensorDataComponent from '../components/SensorDataComponent';
import FloorplanTest from './FloorplanTest';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;


interface Device {
  id: string;
  name: string;
  device_type_id: number;
  floorplan_id: number;
  x_percent: number; // 0 to 1
  y_percent: number; // 0 to 1
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
  onClick?: () => void; // <-- add this
  onDoubleClick?: () => void; // <-- add this
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
  onClick,
  onDoubleClick,
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
    backgroundColor: '#03A9F4',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    cursor: 'grab',
    margin: 0,
    padding: 0,

  };
    return (
    <div
      style={style}
      onPointerUp={onClick} // <-- use onPointerUp instead of onClick
      onDoubleClick={onDoubleClick} // <-- add this
    >
      {label}
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
          const response = await fetch(`${SERVER_URL}/api/floorplans/getd`);
          const data = await response.json();
          setDevices(data);
        } catch (error) {
          console.error('Error fetching devices:', error);
        }
      };
      fetchDevices();
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
  
    // Handles drag end event to update device position (percent-based)
    
  
    
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
                    .filter((device) => device.floorplan_id === selected?.id)
                    .map((device) => (
                      <DeviceItem
                        key={device.id}
                        id={device.id}
                        label={device.id}
                        position={
                          devicePositions[device.id] || {
                            x: device.x_percent,
                            y: device.y_percent,
                          }
                        }
                        containerWidth={renderedSize.width}
                        containerHeight={renderedSize.height}
                      />
                    ))}
              </AspectRatioBox>
            </div>
          )}
        </div>
        </div>
        
      </div>
      

      <div>
        <FloorplanTest />
      </div>
      
      {/* Add widgets/components for temperature, humidity, security, etc. */}
      <div className={styles.Wrapper}>
        <div className={styles.left}>
          <MonitorPage />
        </div>
        <div className={styles.right}>
          <h3>Sensors</h3>
          <SensorDataComponent />
          
            {/* <div
            style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              marginTop: '2rem',
            }}
          > 
           <div
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                minWidth: '200px',
                background: '#fafafa',
              }}
            >
              <h2>Temperature</h2>
              <p>22°C</p>
            </div>
            <div
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                minWidth: '200px',
                background: '#fafafa',
              }}
            >
              <h2>Humidity</h2>
              <p>45%</p>
            </div>
            <div
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                minWidth: '200px',
                background: '#fafafa',
              }}
            >
              <h2>Security</h2>
              <p>All secure</p>
            </div>
          </div>
           */}
            
          
        </div>
      </div>
      
    </div>
  );
}
