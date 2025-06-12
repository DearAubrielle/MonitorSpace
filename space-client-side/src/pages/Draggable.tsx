// App.tsx
import { useRef, useState, useEffect } from "react";
import {
  DndContext,
  useDraggable,
  DragEndEvent,
} from "@dnd-kit/core";

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

// Container size presets (width and height)
const CONTAINER_SIZE_PRESETS = [
  { label: "Small", width: 320, height: 240 },
  { label: "Medium", width: 600, height: 400 },
  { label: "Large", width: 900, height: 600 },
];

// Box size as a percentage of container size
const BOX_SIZE_PERCENT = 0.15;

// Minimum and maximum box size in pixels
const MIN_BOX_SIZE = 10;
const MAX_BOX_SIZE = 60;

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
    backgroundColor: "#03A9F4",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    cursor: "grab",
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

export default function Draggable() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // State for selected container size preset
  const [containerSizePreset, setContainerSizePreset] = useState(CONTAINER_SIZE_PRESETS[1]);

  // Store positions as percentages
  const [boxes, setBoxes] = useState<Record<string, PercentPosition>>({
    box1: { x: 0.1, y: 0.1 },
    box2: { x: 0.3, y: 0.3 },
    box3: { x: 0.6, y: 0.6 },
  });

  // Track container width and height from preset
  const [containerSize, setContainerSize] = useState({
    width: containerSizePreset.width,
    height: containerSizePreset.height,
  });

  // Update container size when preset changes
  useEffect(() => {
    setContainerSize({
      width: containerSizePreset.width,
      height: containerSizePreset.height,
    });
  }, [containerSizePreset]);

  // Optionally, update width on window resize if you want
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setContainerSize((prev) => ({
          ...prev,
          width: containerRef.current?.offsetWidth ?? prev.width,
        }));
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta, active } = event;
    const id = active.id as string;
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;

    // Use square box size for calculations
    const boxSize = Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT;

    const current = boxes[id];
    if (!current) return;

    // Convert percent to px
    const currentX = current.x * (containerWidth - boxSize);
    const currentY = current.y * (containerHeight - boxSize);

    let newX = currentX + delta.x;
    let newY = currentY + delta.y;

    // Clamp to stay inside container
    newX = Math.max(0, Math.min(newX, containerWidth - boxSize));
    newY = Math.max(0, Math.min(newY, containerHeight - boxSize));

    // Convert back to percent
    const percentX = (containerWidth - boxSize) === 0 ? 0 : newX / (containerWidth - boxSize);
    const percentY = (containerHeight - boxSize) === 0 ? 0 : newY / (containerHeight - boxSize);

    setBoxes((prev) => ({
      ...prev,
      [id]: { x: percentX, y: percentY },
    }));
  };

  return (
    <div style={{ padding: 24, background: "#fefef0", minHeight: "100vh" }}>
      <h2 style={{ color: "#236478" }}>Multi-Box Drag (TSX)</h2>
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>Container size:</span>
        {CONTAINER_SIZE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            style={{
              marginRight: 8,
              padding: "4px 12px",
              background: containerSizePreset.label === preset.label ? "#236478" : "#eee",
              color: containerSizePreset.label === preset.label ? "#fff" : "#236478",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
            onClick={() => setContainerSizePreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: containerSize.width,
          height: containerSize.height,
          maxWidth: "100%",
          border: "2px solid #ccc",
          borderRadius: 12,
          backgroundColor: "#fff",
          overflow: "hidden",
          margin: "0 auto",
          transition: "width 0.3s, height 0.3s",
        }}
      >
        <DndContext onDragEnd={handleDragEnd}>
          {Object.entries(boxes).map(([id, position]) => (
            <DraggableBox
              key={id}
              id={id}
              position={position}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
            />
          ))}
        </DndContext>
      </div>
    </div>
  );
}
