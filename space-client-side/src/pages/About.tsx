// App.jsx
import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableItem = ({ id }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "12px",
    marginBottom: "8px",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {id}
    </div>
  );
};

// Add a simple DropContainer component
const DropContainer = ({ children, isOver }) => (
  <div
    style={{
      minHeight: "80px",
      background: isOver ? "#d1ffd6" : "#e0e0e0",
      border: "2px dashed #aaa",
      borderRadius: "8px",
      marginTop: "24px",
      padding: "12px",
      textAlign: "center",
      transition: "background 0.2s",
    }}
  >
    {children || <span>Drop here</span>}
  </div>
);

export default function About() {
  const [items, setItems] = useState(["Apple", "Banana", "Cherry", "Date"]);
  const [droppedItems, setDroppedItems] = useState<string[]>([]);
  const [isOverDrop, setIsOverDrop] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    // If dropped over the drop container
    if (over && over.id === "drop-container") {
      setDroppedItems((prev) => [...prev, active.id]);
      setItems((prev) => prev.filter((item) => item !== active.id));
    } else if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      setItems((items) => arrayMove(items, oldIndex, newIndex));
    }
    setIsOverDrop(false);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    setIsOverDrop(over && over.id === "drop-container");
  };

  return (
    <div style={{ maxWidth: 300, margin: "0 auto", padding: "20px" }}>
      <h2>Drag and Drop List</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item} id={item} />
          ))}
        </SortableContext>
        {/* Drop container as a droppable area */}
        <div style={{ marginTop: "32px" }}>
          <SortableContext items={[]} strategy={verticalListSortingStrategy}>
            <div id="drop-container">
              <DropContainer isOver={isOverDrop}>
                {droppedItems.length > 0 &&
                  droppedItems.map((item) => (
                    <div
                      key={item}
                      style={{
                        padding: "8px",
                        margin: "4px 0",
                        background: "#f0f0f0",
                        borderRadius: "6px",
                      }}
                    >
                      {item}
                    </div>
                  ))}
              </DropContainer>
            </div>
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}
