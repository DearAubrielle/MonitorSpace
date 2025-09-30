import styles from './FloorPlan.module.css';
import { useRef, useEffect, useState } from 'react';
import AspectRatioBox from '../components/AspectRatioBox';
import {
  DndContext,
  useDraggable,
  DragEndEvent,
} from "@dnd-kit/core";
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
}) => {
  // Box size is always square, clamped between MIN_BOX_SIZE and MAX_BOX_SIZE
  const boxSize = Math.max(
    MIN_BOX_SIZE,
    Math.min(Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT, MAX_BOX_SIZE)
  );

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  // Convert percent to px for rendering
  const left = position.x * (containerWidth - boxSize);
  const top = position.y * (containerHeight - boxSize);

  const style: React.CSSProperties = {
    position: "absolute",
    top,
    left,
    width: boxSize,
    height: boxSize,
    fontSize: "12px",
    backgroundColor: "#03A9F4",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    cursor: "grab",
    margin: 0,
    padding: 0,

    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    transition: transform ? "none" : "transform 0.2s",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onPointerUp={onClick} // <-- use onPointerUp instead of onClick
    >
      {label}
    </div>
  );
};

export default function FloorplanPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [floorplans, setFloorplans] = useState<floorplan[]>([]);
  const [selected, setSelected] = useState<floorplan | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 500, height: 500 });
  const [devices, setDevices] = useState<Device[]>([]);
  // Fetch floorplans only (no image size logic here)
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

  // Fetch devices from backend
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

  // Only fetch image size when selected floorplan changes
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

  // Responsive: update rendered width/height on resize
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
  const [devicePositions, setDevicePositions] = useState<Record<string, PercentPosition>>({});

  // Update devicePositions when devices or selected floorplan changes
  useEffect(() => {
    if (!selected) return;
    const filtered = devices.filter(d => d.floorplan_id === selected.id);
    const positions: Record<string, PercentPosition> = {};
    filtered.forEach(device => {
      positions[device.id] = { x: device.x_percent, y: device.y_percent };
    });
    setDevicePositions(positions);
  }, [devices, selected]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    const containerWidth = renderedSize.width;
    const containerHeight = renderedSize.height;

    const boxSize = Math.max(
      MIN_BOX_SIZE,
      Math.min(Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT, MAX_BOX_SIZE)
    );

    const current = devicePositions[id];
    if (!current) return;

    const currentX = current.x * (containerWidth - boxSize);
    const currentY = current.y * (containerHeight - boxSize);

    let newX = currentX + delta.x;
    let newY = currentY + delta.y;

    newX = Math.max(0, Math.min(newX, containerWidth - boxSize));
    newY = Math.max(0, Math.min(newY, containerHeight - boxSize));

    const percentX = (containerWidth - boxSize) === 0 ? 0 : newX / (containerWidth - boxSize);
    const percentY = (containerHeight - boxSize) === 0 ? 0 : newY / (containerHeight - boxSize);

    setDevicePositions((prev) => ({
      ...prev,
      [id]: { x: percentX, y: percentY },
    }));
  };

  // Example handler
  const handleDeviceClick = (device: Device) => {
    alert(`Device: ${device.name} (ID: ${device.id})`);
    // Or open a popup, etc.
  };

  return (
    <div>
      <h2 style={{ fontSize: '1rem', marginLeft: '0.7rem' }}>Floor Plan</h2>
      <div className={styles.Wrapper}>
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
                    .filter(device => device.floorplan_id === selected?.id)
                    .map(device => (
                      <DraggableBox
                        key={device.id}
                        id={device.id}
                        label={device.id}
                        position={devicePositions[device.id] || { x: device.x_percent, y: device.y_percent }}
                        containerWidth={renderedSize.width}
                        containerHeight={renderedSize.height}
                        onClick={() => handleDeviceClick(device)} // <-- add this
                      />
                    ))}
                </DndContext>
              </AspectRatioBox>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
