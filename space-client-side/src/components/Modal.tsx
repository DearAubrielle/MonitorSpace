import * as React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
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
  zIndex: 100,
};

const defaultModalStyle: React.CSSProperties = {
  background: '#fff',
  padding: 24,
  borderRadius: 8,
  minWidth: 300,
};

const Modal: React.FC<ModalProps> = ({ open, onClose, children, style }) => {
  if (!open) return null;
  return (
    <div style={defaultOverlayStyle}>
      <div style={{ ...defaultModalStyle, ...style }}>
        {children}
        <button onClick={onClose} style={{ marginTop: 16 }}>Close</button>
      </div>
    </div>
  );
};

export default Modal;
