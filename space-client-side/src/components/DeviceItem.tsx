export interface DevicesBoxProps {
  id: string;
  label: string;
  position: {
    x: number;
    y: number;
  };
  containerWidth: number;
  containerHeight: number;
  iconURL?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

const BOX_SIZE_PERCENT = 0.07;
const MIN_BOX_SIZE = 20;
const MAX_BOX_SIZE = 40;

const DeviceItem = ({
  position,
  containerWidth,
  containerHeight,
  iconURL,
  onClick,
}: DevicesBoxProps) => {
  const boxSize = Math.max(
    MIN_BOX_SIZE,
    Math.min(
      Math.min(containerWidth, containerHeight) * BOX_SIZE_PERCENT,
      MAX_BOX_SIZE
    )
  );

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
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    backgroundImage: iconURL ? `url(${iconURL})` : undefined,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '20%',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.64)',
    cursor: 'grab',
    margin: 0,
    padding: '5px',
  };

  return <div style={style} onPointerUp={onClick}></div>;
};

export default DeviceItem;
