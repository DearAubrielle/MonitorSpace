import { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";

const devicesList = [
  "TemperaturePL",
  "TemperatureQT",
  "Gas Detector model E 1",
  "Gas Detector model E 2",
];

// ✅ Draggable item
function DraggableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
    });

  const style: React.CSSProperties = {
    padding: "10px 14px",
    margin: "6px 0",
    backgroundColor: "#f0f7ff",
    borderRadius: "6px",
    cursor: "grab",
    display: "inline-block", // ✅ ขยายตามข้อความ
    whiteSpace: "nowrap", // ✅ ไม่ตัดบรรทัด
    opacity: isDragging ? 0.5 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {id}
    </div>
  );
}

// ✅ Droppable container
function DroppableContainer({
  id,
  items,
  title,
}: {
  id: string;
  items: string[];
  title: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minHeight: "200px", // ✅ สูงขั้นต่ำ แต่จะขยายตาม content
        margin: "0 10px",
        padding: "10px",
        border: "1px solid black",
        backgroundColor: isOver ? "#e6f7ff" : "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "6px", // ระยะห่าง item
      }}
    >
      <h3 style={{ marginBottom: "10px" }}>{title}</h3>
      {items.map((item) => (
        <DraggableItem key={item} id={item} />
      ))}
    </div>
  );
}

// ✅ Main App
export default function DevicesDrop() {
  const [leftItems, setLeftItems] = useState(devicesList);
  const [rightItems, setRightItems] = useState<string[]>([
    "TemperaturePL",
    "TemperatureQT",
  ]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    // 👉 ถ้า drop ลงฝั่งซ้าย
    if (over.id === "left") {
      if (!leftItems.includes(active.id as string)) {
        setLeftItems([...leftItems, active.id as string]);
      }
      setRightItems(rightItems.filter((i) => i !== active.id));
    }

    // 👉 ถ้า drop ลงฝั่งขวา
    if (over.id === "right") {
      if (!rightItems.includes(active.id as string)) {
        setRightItems([...rightItems, active.id as string]);
      }
      setLeftItems(leftItems.filter((i) => i !== active.id));
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ display: "flex", padding: "20px" }}>
        <DroppableContainer id="left" items={leftItems} title="Devices" />
        <DroppableContainer
          id="right"
          items={rightItems}
          title="To current floor plan"
        />
      </div>
      <div style={{ textAlign: "right", padding: "20px" }}>
        <button
          style={{
            padding: "10px 20px",
            borderRadius: "6px",
            backgroundColor: "#e6f0ff",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => alert("Saved!")}
        >
          Save
        </button>
      </div>
    </DndContext>
  );
}