interface AspectRatioBoxProps {
  originalWidth: number;
  originalHeight: number;
  backgroundImage?: string; // path or URL
  maxWidth?: string;
  maxHeight?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  backgroundStyle?: React.CSSProperties;
}

const AspectRatioBox: React.FC<AspectRatioBoxProps> = ({
  originalWidth,
  originalHeight,
  backgroundImage,
  maxWidth,
  maxHeight,
  children,
  style = {},
  backgroundStyle = {}
}) => {
  const aspectRatio = originalHeight / originalWidth;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    paddingBottom: `${aspectRatio * 100}%`, // maintains ratio
    maxWidth,
    maxHeight,
    ...style
  };

  const contentStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: "contain", // or 'cover' if you want it filled
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    ...backgroundStyle
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
};
export default AspectRatioBox;