
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Props type for Item
interface ItemProps {
  id: string | number;
}

export function Item({ id }: ItemProps) {
  const style: React.CSSProperties = {
    width: "100%",
    height: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid black",
    margin: "10px 0",
    background: "white",
  };

  return <div style={style}>{id}</div>;
}

// Props type for SortableItem
interface SortableItemProps {
  id: string | number;
}

export default function SortableItem({ id }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Item id={id} />
    </div>
  );
}
