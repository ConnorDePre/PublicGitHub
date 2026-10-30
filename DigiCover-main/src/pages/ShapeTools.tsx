import { useRef, useState } from "react";
import { Link } from "react-router-dom";

type Tool = "rectangle" | "circle" | "triangle" | "line" | "freeDraw";

type ShapeItem = {
  id: number;
  type: "rectangle" | "circle" | "triangle" | "line";
  size: number;
  lineThickness: number;
  x: number;
  y: number;
};

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  id: number;
  points: Point[];
  brushSize: number;
};

function ShapeTools() {
  const [selectedTool, setSelectedTool] = useState<Tool>("rectangle");
  const [shapeSize, setShapeSize] = useState(120);
  const [lineLength, setLineLength] = useState(180);
  const [lineThickness, setLineThickness] = useState(6);
  const [brushSize, setBrushSize] = useState(6);

  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId) ?? null;

  const getCanvasPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const addShape = () => {
    if (selectedTool === "freeDraw") return;

    const newShape: ShapeItem = {
      id: Date.now(),
      type: selectedTool,
      size: selectedTool === "line" ? lineLength : shapeSize,
      lineThickness,
      x: 100 + (shapes.length % 3) * 230,
      y: 100 + Math.floor(shapes.length / 3) * 180,
    };

    setShapes((prev) => [...prev, newShape]);
    setSelectedShapeId(newShape.id);
  };

  const removeShape = (id: number) => {
    setShapes((prev) => prev.filter((shape) => shape.id !== id));

    if (selectedShapeId === id) {
      setSelectedShapeId(null);
    }
  };

  const updateSelectedShapeSize = (size: number) => {
    if (selectedShapeId === null) return;

    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === selectedShapeId
          ? {
              ...shape,
              size,
            }
          : shape
      )
    );
  };

  const updateSelectedLineThickness = (thickness: number) => {
    if (selectedShapeId === null) return;

    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === selectedShapeId && shape.type === "line"
          ? {
              ...shape,
              lineThickness: thickness,
            }
          : shape
      )
    );
  };

  const clearWorkspace = () => {
    setShapes([]);
    setStrokes([]);
    setSelectedShapeId(null);
  };

  const startDraggingShape = (
    event: React.MouseEvent<HTMLDivElement>,
    shape: ShapeItem
  ) => {
    event.stopPropagation();

    if (selectedTool === "freeDraw") return;

    const canvasPoint = getCanvasPoint(event);

    setSelectedShapeId(shape.id);
    setDraggingId(shape.id);
    setDragOffset({
      x: canvasPoint.x - shape.x,
      y: canvasPoint.y - shape.y,
    });
  };

  const dragShape = (event: React.MouseEvent<HTMLDivElement>) => {
    if (draggingId === null || selectedTool === "freeDraw") return;

    const canvasPoint = getCanvasPoint(event);

    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === draggingId
          ? {
              ...shape,
              x: canvasPoint.x - dragOffset.x,
              y: canvasPoint.y - dragOffset.y,
            }
          : shape
      )
    );
  };

  const stopDraggingShape = () => {
    setDraggingId(null);
  };

  const handleWorkspaceClick = () => {
    if (selectedTool !== "freeDraw") {
      setSelectedShapeId(null);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool !== "freeDraw") return;

    const point = getCanvasPoint(event);

    const newStroke: Stroke = {
      id: Date.now(),
      points: [point],
      brushSize,
    };

    setStrokes((prev) => [...prev, newStroke]);
    setIsDrawing(true);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || selectedTool !== "freeDraw") return;

    const point = getCanvasPoint(event);

    setStrokes((prev) => {
      const updated = [...prev];
      const lastStroke = updated[updated.length - 1];

      if (!lastStroke) return updated;

      updated[updated.length - 1] = {
        ...lastStroke,
        points: [...lastStroke.points, point],
      };

      return updated;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const renderShape = (shape: ShapeItem) => {
    if (shape.type === "rectangle") {
      return (
        <div
          style={{
            width: shape.size + 40,
            height: shape.size,
            background: "#e50914",
            borderRadius: "10px",
          }}
        />
      );
    }

    if (shape.type === "circle") {
      return (
        <div
          style={{
            width: shape.size,
            height: shape.size,
            background: "#e50914",
            borderRadius: "50%",
          }}
        />
      );
    }

    if (shape.type === "triangle") {
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${shape.size / 2}px solid transparent`,
            borderRight: `${shape.size / 2}px solid transparent`,
            borderBottom: `${shape.size}px solid #e50914`,
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: shape.size,
          height: shape.lineThickness,
          background: "#e50914",
          borderRadius: "999px",
        }}
      />
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070707",
        color: "#ffffff",
        padding: "36px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "48px", fontWeight: 800 }}>
            Shapes Tool
          </h1>
          <p style={{ color: "#bdbdbd", marginTop: "8px" }}>
            Add preset shapes, straight lines, and free draw elements to the editor workspace.
          </p>
        </div>

        <Link to="/Home">
          <button style={exitButtonStyle}>Exit Shapes Tab</button>
        </Link>
      </div>

      <div
        style={{
          marginTop: "26px",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "24px",
        }}
      >
        <aside style={panelStyle}>
          <h2 style={sectionTitleStyle}>Tools</h2>

          <div style={{ display: "grid", gap: "10px" }}>
            <button
              style={selectedTool === "rectangle" ? activeButtonStyle : buttonStyle}
              onClick={() => setSelectedTool("rectangle")}
            >
              Rectangle
            </button>

            <button
              style={selectedTool === "circle" ? activeButtonStyle : buttonStyle}
              onClick={() => setSelectedTool("circle")}
            >
              Circle
            </button>

            <button
              style={selectedTool === "triangle" ? activeButtonStyle : buttonStyle}
              onClick={() => setSelectedTool("triangle")}
            >
              Triangle
            </button>

            <button
              style={selectedTool === "line" ? activeButtonStyle : buttonStyle}
              onClick={() => setSelectedTool("line")}
            >
              Straight Line
            </button>

            <button
              style={selectedTool === "freeDraw" ? activeButtonStyle : buttonStyle}
              onClick={() => {
                setSelectedTool("freeDraw");
                setSelectedShapeId(null);
              }}
            >
              Free Draw
            </button>
          </div>

          <div style={{ marginTop: "24px" }}>
            {selectedTool !== "line" && selectedTool !== "freeDraw" && (
              <>
                <label style={labelStyle}>New Shape Size: {shapeSize}px</label>
                <input
                  type="range"
                  min="50"
                  max="240"
                  value={shapeSize}
                  onChange={(e) => setShapeSize(Number(e.target.value))}
                  style={rangeStyle}
                />

                <button style={primaryButtonStyle} onClick={addShape}>
                  Add {selectedTool}
                </button>
              </>
            )}

            {selectedTool === "line" && (
              <>
                <label style={labelStyle}>New Line Length: {lineLength}px</label>
                <input
                  type="range"
                  min="60"
                  max="420"
                  value={lineLength}
                  onChange={(e) => setLineLength(Number(e.target.value))}
                  style={rangeStyle}
                />

                <label style={labelStyle}>New Line Thickness: {lineThickness}px</label>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={lineThickness}
                  onChange={(e) => setLineThickness(Number(e.target.value))}
                  style={rangeStyle}
                />

                <button style={primaryButtonStyle} onClick={addShape}>
                  Add Straight Line
                </button>
              </>
            )}

            {selectedTool === "freeDraw" && (
              <>
                <label style={labelStyle}>Brush Size: {brushSize}px</label>
                <input
                  type="range"
                  min="2"
                  max="28"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  style={rangeStyle}
                />

                <p style={{ color: "#bdbdbd", fontSize: "14px", lineHeight: 1.5 }}>
                  Click and drag inside the workspace to draw freely.
                </p>
              </>
            )}

            {selectedShape && selectedTool !== "freeDraw" && (
              <div style={selectedPanelStyle}>
                <h3 style={{ marginTop: 0 }}>Selected Shape</h3>
                <p style={{ color: "#bdbdbd", fontSize: "14px" }}>
                  Editing: {selectedShape.type}
                </p>

                <label style={labelStyle}>
                  {selectedShape.type === "line" ? "Line Length" : "Shape Size"}:{" "}
                  {selectedShape.size}px
                </label>
                <input
                  type="range"
                  min={selectedShape.type === "line" ? "60" : "50"}
                  max={selectedShape.type === "line" ? "420" : "240"}
                  value={selectedShape.size}
                  onChange={(e) => updateSelectedShapeSize(Number(e.target.value))}
                  style={rangeStyle}
                />

                {selectedShape.type === "line" && (
                  <>
                    <label style={labelStyle}>
                      Line Thickness: {selectedShape.lineThickness}px
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="24"
                      value={selectedShape.lineThickness}
                      onChange={(e) =>
                        updateSelectedLineThickness(Number(e.target.value))
                      }
                      style={rangeStyle}
                    />
                  </>
                )}

                <button
                  style={secondaryButtonStyle}
                  onClick={() => setSelectedShapeId(null)}
                >
                  Deselect Shape
                </button>
              </div>
            )}

            <button style={secondaryButtonStyle} onClick={clearWorkspace}>
              Clear Workspace
            </button>
          </div>
        </aside>

        <main>
          <div
            ref={canvasRef}
            style={{
              position: "relative",
              height: "620px",
              background: "#111111",
              border: "2px solid #333",
              borderRadius: "18px",
              overflow: "hidden",
              cursor:
                selectedTool === "freeDraw"
                  ? "crosshair"
                  : draggingId !== null
                  ? "grabbing"
                  : "default",
            }}
            onClick={handleWorkspaceClick}
            onMouseDown={handleMouseDown}
            onMouseMove={(event) => {
              handleMouseMove(event);
              dragShape(event);
            }}
            onMouseUp={() => {
              stopDrawing();
              stopDraggingShape();
            }}
            onMouseLeave={() => {
              stopDrawing();
              stopDraggingShape();
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "18px",
                left: "18px",
                color: "#888",
                fontSize: "14px",
              }}
            >
              Editor Workspace Preview
            </div>

            {shapes.map((shape) => {
              const isSelected = selectedShapeId === shape.id;

              return (
                <div
                  key={shape.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedShapeId(shape.id);
                  }}
                  onMouseDown={(event) => startDraggingShape(event, shape)}
                  style={{
                    position: "absolute",
                    left: shape.x,
                    top: shape.y,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    cursor: draggingId === shape.id ? "grabbing" : "grab",
                    userSelect: "none",
                    padding: "6px",
                    border: isSelected ? "2px dashed #ffffff" : "2px solid transparent",
                    borderRadius: "12px",
                  }}
                >
                  {renderShape(shape)}

                  <button
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeShape(shape.id);
                    }}
                    style={{
                      background: "#222",
                      color: "#fff",
                      border: "1px solid #444",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "12px",
                      minWidth: "110px",
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              {strokes.map((stroke) => (
                <polyline
                  key={stroke.id}
                  points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#e50914"
                  strokeWidth={stroke.brushSize}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          </div>
        </main>
      </div>
    </div>
  );
}

const panelStyle = {
  background: "#151515",
  border: "1px solid #2e2e2e",
  borderRadius: "18px",
  padding: "22px",
};

const selectedPanelStyle = {
  marginTop: "22px",
  background: "#101010",
  border: "1px solid #444",
  borderRadius: "14px",
  padding: "16px",
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "22px",
};

const buttonStyle = {
  background: "#222",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "12px",
  padding: "13px",
  cursor: "pointer",
  fontWeight: 700,
};

const activeButtonStyle = {
  ...buttonStyle,
  background: "#e50914",
  border: "1px solid #e50914",
};

const primaryButtonStyle = {
  width: "100%",
  marginTop: "14px",
  background: "#e50914",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryButtonStyle = {
  width: "100%",
  marginTop: "12px",
  background: "#2a2a2a",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "12px",
  padding: "13px",
  cursor: "pointer",
  fontWeight: 700,
};

const exitButtonStyle = {
  background: "#111",
  color: "#fff",
  border: "1px solid #555",
  borderRadius: "12px",
  padding: "13px 18px",
  cursor: "pointer",
  fontWeight: 800,
};

const labelStyle = {
  display: "block",
  marginTop: "14px",
  marginBottom: "8px",
  fontWeight: 700,
};

const rangeStyle = {
  width: "100%",
};

export default ShapeTools;