interface ModalProps {
  open: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  position?: {
    x: number;
    y: number;
  };
}

const defaultOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Keep dialogs above hovered device markers and drag previews on the floorplan.
  zIndex: 11000,
};

const defaultModalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  minWidth: 300,
  maxWidth: '70%',
  padding: 6,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100dvh - 32px)',
  overflow: 'hidden',
};

const scrollSurfaceStyle: React.CSSProperties = {
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  padding: 26,
  borderRadius: 6,
};

export default function Modal({ open, children, style, position }: ModalProps) {
  if (!open) return null;

  // Calculate modal positioning
  const getModalPosition = (): React.CSSProperties => {
    if (!position) {
      return {
        alignItems: 'center',
        justifyContent: 'center',
      };
    }

    // Position modal near the device with smart positioning to avoid viewport edges
    const modalWidth = 400; // Approximate modal width
    const modalHeight = 300; // Approximate modal height
    const offset = 20; // Distance from device

    let left = position.x + offset;
    let top = position.y - modalHeight / 2;

    // Adjust if modal would go off-screen
    if (left + modalWidth > window.innerWidth) {
      left = position.x - modalWidth - offset; // Show to the left of device
    }
    if (left < 0) {
      left = offset; // Minimum distance from left edge
    }
    if (top < 0) {
      top = offset; // Minimum distance from top
    }
    if (top + modalHeight > window.innerHeight) {
      top = window.innerHeight - modalHeight - offset; // Adjust to fit in viewport
    }

    return {
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingTop: `${top}px`,
      paddingLeft: `${left}px`,
    };
  };

  const overlayStyles = {
    ...defaultOverlayStyle,
    ...getModalPosition(),
  };

  return (
    <div style={overlayStyles}>
      <div style={{ ...defaultModalStyle, ...style }}>
        <div style={scrollSurfaceStyle}>{children}</div>
      </div>
    </div>
  );
}
