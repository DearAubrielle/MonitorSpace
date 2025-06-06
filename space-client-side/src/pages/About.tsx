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

export default function About() {
  const [items, setItems] = useState(["Apple", "Banana", "Cherry", "Date"]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      setItems((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: "0 auto", padding: "20px" }}>
      <h2>Drag and Drop List</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item} id={item} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
