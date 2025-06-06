// App.tsx
import React, { useRef, useState } from "react";
import {
  DndContext,
  useDraggable,
  DragEndEvent,
} from "@dnd-kit/core";

// Type for box position
type Position = {
  x: number;
  y: number;
};

// Props for each draggable box
interface DraggableBoxProps {
  id: string;
  position: Position;
}

// Size of each box
const boxSize = { width: 80, height: 80 };

// Draggable box component
const DraggableBox: React.FC<DraggableBoxProps> = ({ id, position }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style: React.CSSProperties = {
    position: "absolute",
    top: position.y,
    left: position.x,
    width: boxSize.width,
    height: boxSize.height,
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

  const [boxes, setBoxes] = useState<Record<string, Position>>({
    box1: { x: 40, y: 50 },
    box2: { x: 150, y: 100 },
    box3: { x: 300, y: 200 },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta, active } = event;
    const id = active.id as string;
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const current = boxes[id];
    if (!current) return;

    const newX = current.x + delta.x;
    const newY = current.y + delta.y;

    // Clamp to stay inside container
    const clampedX = Math.max(0, Math.min(newX, containerWidth - boxSize.width));
    const clampedY = Math.max(0, Math.min(newY, containerHeight - boxSize.height));

    setBoxes((prev) => ({
      ...prev,
      [id]: { x: clampedX, y: clampedY },
    }));
  };

  return (
    <div style={{ padding: 40, background: "#fefef0", height: "100vh" }}>
      <h2 style={{ color: "#236478" }}>Multi-Box Drag (TSX)</h2>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: 500,
          height: 400,
          border: "2px solid #ccc",
          borderRadius: 12,
          backgroundColor: "#fff",
          overflow: "hidden",
        }}
      >
        <DndContext onDragEnd={handleDragEnd}>
          {Object.entries(boxes).map(([id, position]) => (
            <DraggableBox key={id} id={id} position={position} />
          ))}
        </DndContext>
      </div>
    </div>
  );
};
