import React, { useState, useRef } from "react";
import {
  DndContext,
  useDraggable,
} from "@dnd-kit/core";

// Individual draggable box
function DraggableBox({ id, position, onDragEnd }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = {
    position: "absolute",
    top: position.y,
    left: position.x,
    width: 80,
    height: 80,
    backgroundColor: "#2196F3",
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
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
    >
      {id}
    </div>
  );
}

export default function DndKit() {
  const containerRef = useRef(null);
  const boxSize = { width: 80, height: 80 };

  // Store position for each box by id
  const [boxes, setBoxes] = useState({
    box1: { x: 50, y: 50 },
    box2: { x: 200, y: 120 },
    box3: { x: 120, y: 250 },
  });

  const handleDragEnd = (event) => {
    const { delta, active } = event;
    const id = active.id;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const current = boxes[id];
    if (!current) return;

    const newX = current.x + delta.x;
    const newY = current.y + delta.y;

    const clampedX = Math.max(0, Math.min(newX, rect.width - boxSize.width));
    const clampedY = Math.max(0, Math.min(newY, rect.height - boxSize.height));

    setBoxes((prev) => ({
      ...prev,
      [id]: { x: clampedX, y: clampedY },
    }));
  };

  return (
    <div style={{ padding: "40px", background: "#fefef0", height: "100vh" }}>
      <h2 style={{ color: "#236478" }}>Multi-Box Free Drag</h2>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: 500,
          height: 400,
          border: "2px solid #ccc",
          borderRadius: 12,
          backgroundColor: "#fff",
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
}
