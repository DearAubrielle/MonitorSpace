import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "./SortableItem";

// Props type
interface ContainerProps {
  id: string | number;
  items: (string | number)[];
}

const containerStyle: React.CSSProperties = {
  background: "#dadada",
  padding: 10,
  margin: 10,
  flex: 1,
};

export default function Container({ id, items }: ContainerProps) {
  const { setNodeRef } = useDroppable({
    id: String(id),
  });

  return (
    <SortableContext id={String(id)} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} style={containerStyle}>
        {items.map((itemId) => (
          <SortableItem key={itemId} id={itemId} />
        ))}
      </div>
    </SortableContext>
  );
}
