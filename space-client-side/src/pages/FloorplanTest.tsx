import styles from './FloorPlan.module.css';
import { useRef,useEffect, useState } from 'react';
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

// Props for each draggable box
interface DraggableBoxProps {
  id: string;
  position: PercentPosition;
  containerWidth: number;
  containerHeight: number;
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
  position,
  containerWidth,
  containerHeight,
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
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      {id}
    </div>
  );
};

export default function FloorplanTest() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [floorplans, setFloorplans] = useState<floorplan[]>([]);
  const [selected, setSelected] = useState<floorplan | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [boxes, setBoxes] = useState<Record<string, PercentPosition>>({
    b1: { x: 0.1, y: 0.1 },
    b2: { x: 0.3, y: 0.3 },
    b3: { x: 0.6, y: 0.6 },
  });

  useEffect(() => {
    const fetchFloorplans = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/floorplans`);
        const data = await response.json();
        setFloorplans(data);
        if (data && data.length > 0) {
          setSelected(data[0]);
          const img = new window.Image();
          img.onload = () => {
            setContainerSize({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          };
          img.src = SERVER_URL + data[0].image_url;
        }
      } catch (error) {
        console.error('Error fetching floorplans:', error);
      }
    };

    fetchFloorplans();
  }, []);

  // Update container size when selected floorplan changes
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    const containerWidth = renderedSize.width;
    const containerHeight = renderedSize.height;

    const boxSize = Math.max(
      MIN_BOX_SIZE,
      Math.min(Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT, MAX_BOX_SIZE)
    );

    const current = boxes[id];
    if (!current) return;

    const currentX = current.x * (containerWidth - boxSize);
    const currentY = current.y * (containerHeight - boxSize);

    let newX = currentX + delta.x;
    let newY = currentY + delta.y;

    newX = Math.max(0, Math.min(newX, containerWidth - boxSize));
    newY = Math.max(0, Math.min(newY, containerHeight - boxSize));

    const percentX = (containerWidth - boxSize) === 0 ? 0 : newX / (containerWidth - boxSize);
    const percentY = (containerHeight - boxSize) === 0 ? 0 : newY / (containerHeight - boxSize);

    setBoxes((prev) => ({
      ...prev,
      [id]: { x: percentX, y: percentY },
    }));
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
                  {Object.entries(boxes).map(([id, position]) => (
                    <DraggableBox
                      key={id}
                      id={id}
                      position={position}
                      containerWidth={renderedSize.width}
                      containerHeight={renderedSize.height}
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
