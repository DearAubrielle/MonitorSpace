import { useDraggable } from '@dnd-kit/core';

export const BOX_SIZE_PERCENT = 0.07;
export const MIN_BOX_SIZE = 20;
export const MAX_BOX_SIZE = 40;

export type PercentPosition = {
  x: number; // 0 to 1
  y: number; // 0 to 1
};

export interface DraggableBoxProps {
  id: string;
  label: string;
  position: PercentPosition;
  containerWidth: number;
  containerHeight: number;
  iconURL?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  disabled?: boolean;
  alert?: boolean;
}

export default function  DraggableBox({
  id,
  position,
  containerWidth,
  containerHeight,
  iconURL,
  onClick,
  onDoubleClick,
  disabled = true,
  alert = false,
}: DraggableBoxProps) {
  const boxSize = Math.max(
    MIN_BOX_SIZE,
    Math.min(
      Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT,
      MAX_BOX_SIZE
    )
  );

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const left = position.x * (containerWidth - boxSize);
  const top = position.y * (containerHeight - boxSize);

  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left,
    width: boxSize,
    height: boxSize,
    fontSize: '12px',
    color: 'white',
    backgroundColor: alert ? 'rgba(255, 0, 0, 0.5)' : 'rgba(132, 221, 243, 0.31)',
    backgroundImage: iconURL ? `url(${iconURL})` : undefined,
    backgroundSize: 'cover',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '20%',
    backdropFilter: 'blur(2px)',
    border: '1px solid rgba(255, 255, 255, 0.56)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.49)',
    margin: 0,
    padding: "5px",
    transform: isDragging && transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    cursor: disabled ? 'default' : 'grab',
    opacity: !disabled ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...(!disabled ? listeners : {})}
      {...(!disabled ? attributes : {})}
      style={style}
      onPointerUp={onClick}
      onDoubleClick={onDoubleClick}
    >
    </div>
  );
};
