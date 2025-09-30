import styles from './FloorPlan.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Type for box position as percentage
type PercentPosition = {
  x: number; // 0 to 1
  y: number; // 0 to 1
};

// Device type
interface Device {
  id: string;
  name: string;
  device_type_id: number;
  floorplan_id: number;
  x_percent: number; // 0 to 1
  y_percent: number; // 0 to 1
}

// Props for each draggable box
// Update DraggableBoxProps to accept onClick
interface DraggableBoxProps {
  id: string;
  label: string;
  position: PercentPosition;
  containerWidth: number;
  containerHeight: number;
  onClick?: () => void; // <-- add this
  onDoubleClick?: () => void; // <-- add this
}

interface floorplan {
  id: number;
  name: string;
  image_url: string;
  description: string;
}
// Box size as a percentage of container size
const BOX_SIZE_PERCENT = 0.07;

// Minimum and maximum box size in pixels
const MIN_BOX_SIZE = 20;
const MAX_BOX_SIZE = 40;

// Draggable box component
const DraggableBox: React.FC<DraggableBoxProps> = ({
  id,
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

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

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

    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    transition: transform ? 'none' : 'transform 0.2s',
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onPointerUp={onClick} // <-- use onPointerUp instead of onClick
      onDoubleClick={onDoubleClick} // <-- add this
    >
      {label}
    </div>
  );
};

export default function FloorplanTest() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [floorplans, setFloorplans] = useState<floorplan[]>([]);
  const [selected, setSelected] = useState<floorplan | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 500,
    height: 500,
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
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
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    const containerWidth = renderedSize.width;
    const containerHeight = renderedSize.height;

    const boxSize = Math.max(
      MIN_BOX_SIZE,
      Math.min(
        Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT,
        MAX_BOX_SIZE
      )
    );

    const current = devicePositions[id];
    if (!current) return;

    const currentX = current.x * (containerWidth - boxSize);
    const currentY = current.y * (containerHeight - boxSize);

    let newX = currentX + delta.x;
    let newY = currentY + delta.y;

    newX = Math.max(0, Math.min(newX, containerWidth - boxSize));
    newY = Math.max(0, Math.min(newY, containerHeight - boxSize));

    const percentX =
      containerWidth - boxSize === 0 ? 0 : newX / (containerWidth - boxSize);
    const percentY =
      containerHeight - boxSize === 0 ? 0 : newY / (containerHeight - boxSize);

    setDevicePositions((prev) => ({
      ...prev,
      [id]: { x: percentX, y: percentY },
    }));
  };

  // Opens modal with device info on double click
  const handleDeviceClick = (device: Device) => {
    setModalDevice(device);
  };

  // Devices not yet on the selected floor plan
  const availableDevices = devices.filter(
    (d) => !selected || d.floorplan_id !== selected.id
  );

  // Track which devices are being added in this session
  const [toAdd, setToAdd] = useState<Device[]>([]);

  // Add device to overlay "toAdd" list
  const handleAddToFloorPlan = (device: Device) => {
    setToAdd((prev) => [...prev, device]);
  };

  // Remove device from overlay "toAdd" list
  const handleRemoveFromFloorPlan = (device: Device) => {
    setToAdd((prev) => prev.filter((d) => d.id !== device.id));
  };

  // Save devices to floorplan by sending PUT requests to backend
  const handleSave = async () => {
    if (!selected) return;
    try {
      // Send a PUT request for each device being added
      await Promise.all(
        toAdd.map((device) =>
          fetch(`${SERVER_URL}/api/floorplans/putd/${device.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ floorplan_id: selected.id }),
          })
        )
      );
      // Update local state after successful update
      setDevices((prev) =>
        prev.map((d) =>
          toAdd.find((add) => add.id === d.id)
            ? { ...d, floorplan_id: selected.id }
            : d
        )
      );
      setToAdd([]);
      setShowOverlay(false);
    } catch (error) {
      console.error('Failed to update devices:', error);
      // Optionally show an error message to the user
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1rem', marginLeft: '0.7rem' }}>Floor Plan</h2>
      <div style={{ margin: '0.7rem 0 1rem 0.7rem' }}>
        <button onClick={() => setShowOverlay(true)} disabled={!selected}>
          Add Device to Floor Plan
        </button>
      </div>
      <div className={styles.Wrapper} style={{ position: 'relative' }}>
        {/* Overlay Add Device Panel */}
        {showOverlay && (
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: '10%',
              width: '80%',
              minHeight: 350,
              background: '#fff',
              border: '1px solid #bbb',
              borderRadius: 8,
              display: 'flex',
              zIndex: 10,
              boxShadow: '0 2px 12px #0001',
              padding: 24,
              gap: 12,
            }}
          >
            {/* Available Devices */}
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Devices</div>
              {availableDevices.map((device) => (
                <div
                  key={device.id}
                  style={{
                    background: '#f5faff',
                    color: '#2563eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 10,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 500,
                    opacity: toAdd.find((d) => d.id === device.id) ? 0.5 : 1,
                    pointerEvents: toAdd.find((d) => d.id === device.id)
                      ? 'none'
                      : 'auto',
                  }}
                  onClick={() => handleAddToFloorPlan(device)}
                >
                  {device.name}
                </div>
              ))}
            </div>
            {/* Devices to be added */}
            <div
              style={{
                flex: 1,
                marginLeft: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                To current floor plan
              </div>
              {toAdd.length === 0 && (
                <div style={{ color: '#888', marginBottom: 12 }}>
                  No devices selected
                </div>
              )}
              {toAdd.map((device) => (
                <div
                  key={device.id}
                  style={{
                    background: '#e6f0fa',
                    color: '#2563eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 10,
                    textAlign: 'center',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: 220,
                  }}
                >
                  <span>{device.name}</span>
                  <button
                    style={{
                      marginLeft: 12,
                      background: 'transparent',
                      border: 'none',
                      color: '#f44336',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                    onClick={() => handleRemoveFromFloorPlan(device)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                style={{
                  marginTop: 24,
                  background: '#e6f0fa',
                  color: '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 24px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: toAdd.length === 0 ? 0.5 : 1,
                }}
                disabled={toAdd.length === 0}
                onClick={handleSave}
              >
                Save
              </button>
              <button
                style={{
                  marginTop: 8,
                  background: '#fff',
                  color: '#888',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontWeight: 400,
                  cursor: 'pointer',
                }}
                onClick={() => setShowOverlay(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Floorplan List */}
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

        {/* Floorplan Image with Drag-and-Drop */}
        <div className={styles.FloorPlan}>
          {selected && (
            <div ref={containerRef} style={{ width: '100%' }}>
              <AspectRatioBox
                originalWidth={containerSize.width}
                originalHeight={containerSize.height}
                backgroundImage={SERVER_URL + selected.image_url}
                maxWidth="100%"
              >
                <DndContext onDragEnd={handleDragEnd}>
                  {devices
                    .filter((device) => device.floorplan_id === selected?.id)
                    .map((device) => (
                      <DraggableBox
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
                        onDoubleClick={() => handleDeviceClick(device)} // <-- add this
                      />
                    ))}
                </DndContext>
              </AspectRatioBox>
            </div>
          )}
        </div>

        {/* Device Info Modal */}
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
