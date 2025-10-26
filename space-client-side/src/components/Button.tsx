interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: React.CSSProperties;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: '#273b66ff',
    color: '#ffffff',
    border: '1px solid #749cdbff',
    borderRadius: 6,
    padding: '7px 20px',
    margin: '5px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondary: {
    background: '#ffffffff',
    color: '#285885ff',
    border: '1px solid #b5cbecff',
    borderRadius: 6,
    padding: '7px 20px',
    margin: '5px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  danger: {
    background: 'transparent',
    color: '#f44336',
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 16,
    padding: '7px 20px',
  },
};
export default function Button({
  children,
  variant = 'primary',
  style,
  ...props
}: ButtonProps) {
  return (
    <button style={{ ...variantStyles[variant], ...style }} {...props}>
      {children}
    </button>
  );
}
