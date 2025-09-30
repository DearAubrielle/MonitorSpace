import{ useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import Container from "./container";
import { Item } from "./SortableItem";

// Styles
const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
};

// Announcements typing
const defaultAnnouncements = {
  onDragStart(id: string | number) {
    console.log(`Picked up draggable item ${id}.`);
  },
  onDragOver(id: string | number, overId?: string | number) {
    if (overId) {
      console.log(`Draggable item ${id} was moved over droppable area ${overId}.`);
      return;
    }
    console.log(`Draggable item ${id} is no longer over a droppable area.`);
  },
  onDragEnd(id: string | number, overId?: string | number) {
    if (overId) {
      console.log(`Draggable item ${id} was dropped over droppable area ${overId}`);
      return;
    }
    console.log(`Draggable item ${id} was dropped.`);
  },
  onDragCancel(id: string | number) {
    console.log(`Dragging was cancelled. Draggable item ${id} was dropped.`);
  },
};

// Items type
type ItemsState = Record<string, string[]>;

export default function DndColumns() {
  const [items, setItems] = useState<ItemsState>({
    devives: ["1", "2", "3"],
    tocurrentfp: ["4", "5", "6"],
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div style={wrapperStyle}>
      <DndContext
        announcements={defaultAnnouncements}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Container id="devives" items={items.devives} />
        <Container id="tocurrentfp" items={items.tocurrentfp} />
        <DragOverlay>{activeId ? <Item id={activeId} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );

  // Find which container an item belongs to
  function findContainer(id: string): string | undefined {
    if (id in items) {
      return id;
    }
    return Object.keys(items).find((key) => items[key].includes(id));
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(String(active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const id = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(id);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      const activeIndex = activeItems.indexOf(id);
      const overIndex = overItems.indexOf(overId);

      let newIndex: number;
      if (overId in prev) {
        newIndex = overItems.length + 1;
      } else {
        // Fallback: insert after the overIndex if possible, otherwise at the end
        const modifier = overIndex === overItems.length - 1 ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: prev[activeContainer].filter((item) => item !== id),
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          items[activeContainer][activeIndex],
          ...prev[overContainer].slice(newIndex),
        ],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const id = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(id);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer !== overContainer) {
      setActiveId(null);
      return;
    }

    const activeIndex = items[activeContainer].indexOf(id);
    const overIndex = items[overContainer].indexOf(overId);

    if (activeIndex !== overIndex) {
      setItems((prev) => ({
        ...prev,
        [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex),
      }));
    }

    setActiveId(null);
  }
}
