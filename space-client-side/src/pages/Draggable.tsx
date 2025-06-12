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

// Box size as a percentage of container size
const BOX_SIZE_PERCENT = 0.15;

// Draggable box component
const DraggableBox: React.FC<DraggableBoxProps> = ({
  id,
  position,
  containerWidth,
  containerHeight,
}) => {
  // Make box size square based on the smallest side of the container
  const boxSide = Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  // Convert percent to px for rendering
  const left = position.x * (containerWidth - boxSide);
  const top = position.y * (containerHeight - boxSide);

  const style: React.CSSProperties = {
    position: "absolute",
    top,
    left,
    width: boxSide,
    height: boxSide,
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

  // Store positions as percentages
  const [boxes, setBoxes] = useState<Record<string, PercentPosition>>({
    box1: { x: 0.1, y: 0.1 },
    box2: { x: 0.3, y: 0.3 },
    box3: { x: 0.6, y: 0.6 },
  });

  const [containerSize, setContainerSize] = useState({ width: 600, height: 480 });

  // Update container size on resize
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
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

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Use square box size for calculations
    const boxSide = Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT;

    const current = boxes[id];
    if (!current) return;

    // Convert percent to px
    const currentX = current.x * (containerWidth - boxSide);
    const currentY = current.y * (containerHeight - boxSide);

    let newX = currentX + delta.x;
    let newY = currentY + delta.y;

    // Clamp to stay inside container
    newX = Math.max(0, Math.min(newX, containerWidth - boxSide));
    newY = Math.max(0, Math.min(newY, containerHeight - boxSide));

    // Convert back to percent
    const percentX = (containerWidth - boxSide) === 0 ? 0 : newX / (containerWidth - boxSide);
    const percentY = (containerHeight - boxSide) === 0 ? 0 : newY / (containerHeight - boxSide);

    setBoxes((prev) => ({
      ...prev,
      [id]: { x: percentX, y: percentY },
    }));
  };

  return (
    <div style={{ padding: 24, background: "#fefef0", minHeight: "100vh" }}>
      <h2 style={{ color: "#236478" }}>Multi-Box Drag (TSX)</h2>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 600,
          aspectRatio: "5 / 4",
          border: "2px solid #ccc",
          borderRadius: 12,
          backgroundColor: "#fff",
          overflow: "hidden",
          margin: "0 auto",
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
