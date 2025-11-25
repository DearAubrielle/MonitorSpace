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
    transition: 'all 0.2s ease',
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
    transition: 'all 0.2s ease',
  },
  danger: {
    background: '#dc2626',
    color: '#ffffff',
    border: '1px solid #dc2626',
    borderRadius: 6,
    padding: '7px 20px',
    margin: '5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
export default function Button({ children, variant = 'primary', style, ...props }: ButtonProps) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLButtonElement;
    if (variant === 'primary') {
      target.style.backgroundColor = '#1e2a4a';
    } else if (variant === 'secondary') {
      target.style.backgroundColor = '#f1f5f9';
    } else if (variant === 'danger') {
      target.style.backgroundColor = '#b91c1c';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLButtonElement;
    if (variant === 'primary') {
      target.style.backgroundColor = '#273b66ff';
    } else if (variant === 'secondary') {
      target.style.backgroundColor = '#ffffffff';
    } else if (variant === 'danger') {
      target.style.backgroundColor = '#dc2626';
    }
  };

  return (
    <button
      style={{ ...variantStyles[variant], ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}
