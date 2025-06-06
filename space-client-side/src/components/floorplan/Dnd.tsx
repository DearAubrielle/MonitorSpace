import { useState } from "react";

const Dnd: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const boxSize = 100; // Blue box size
  const containerSize = { width: 800, height: 600 }; // Adjust as needed

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    let newX = e.clientX - offset.x;
    let newY = e.clientY - offset.y;

    // **Boundary Constraints**
    newX = Math.max(0, Math.min(containerSize.width - boxSize, newX));
    newY = Math.max(0, Math.min(containerSize.height - boxSize, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  return (
    <div
      style={{
        

        width: `${containerSize.width}px`,
        height: `${containerSize.height}px`,
        position: "relative",
        overflow: "hidden",
        border: "1px solid black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          backgroundColor: "blue",
          position: "absolute",
          left: position.x,
          top: position.y,
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "bold",
          fontSize: "16px",
          userSelect: "none", // Prevents text selection while dragging
        }}
        onMouseDown={handleMouseDown}
      >
        Drag Me
      </div>
    </div>
  );
};

export default Dnd;
