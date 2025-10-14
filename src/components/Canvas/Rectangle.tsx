// Rectangle component for Konva canvas
import React, { useRef, useState } from 'react';
import { Rect, Circle, Group, Text } from 'react-konva';
import Konva from 'konva';
import { Rectangle as RectangleType } from '../../types/canvas.types';
import { MIN_RECT_SIZE, MAX_RECT_SIZE } from '../../utils/constants';
import { useCanvas } from '../../hooks/useCanvas';

interface RectangleProps {
  rectangle: RectangleType;
  isSelected: boolean;
  onSelect: () => void;
}

export const Rectangle: React.FC<RectangleProps> = ({ rectangle, isSelected, onSelect }) => {
  const { updateRectangle } = useCanvas();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height });
  const shapeRef = useRef<Konva.Rect>(null);

  // Update current position when rectangle prop changes (e.g., from context updates)
  React.useEffect(() => {
    if (!isDragging && !isResizing) {
      setCurrentPos({ x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height });
    }
  }, [rectangle.x, rectangle.y, rectangle.width, rectangle.height, isDragging, isResizing]);

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag move - update current position for handle
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    setCurrentPos({ x: node.x(), y: node.y(), width: node.width(), height: node.height() });
  };

  // Handle drag end - update position in context
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    const node = e.target;
    updateRectangle(rectangle.id, {
      x: node.x(),
      y: node.y(),
      lastModifiedBy: rectangle.createdBy, // Will be updated with actual user in multiplayer
    });
  };

  // Handle resize via bottom-right handle
  const handleResizeStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true; // Prevent drag propagation
    setIsResizing(true);
  };

  const handleResizeMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true; // Prevent drag propagation
    if (!isResizing) return;

    const stage = e.target.getStage();
    const rect = shapeRef.current;
    if (!rect || !stage) return;

    // Get the current pointer position
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Top-right corner resize: anchor is bottom-left
    const anchorX = rect.x();
    const anchorY = rect.y() + rect.height(); // Bottom edge stays fixed

    // Calculate new dimensions based on pointer position
    const newWidth = Math.max(MIN_RECT_SIZE, Math.min(MAX_RECT_SIZE, pointerPos.x - anchorX));
    const newHeight = Math.max(MIN_RECT_SIZE, Math.min(MAX_RECT_SIZE, anchorY - pointerPos.y));
    
    // New Y position (top edge moves with pointer)
    const newY = anchorY - newHeight;

    // Update the rectangle dimensions and position immediately for visual feedback
    rect.y(newY);
    rect.width(newWidth);
    rect.height(newHeight);

    // Update current position state for handle tracking
    setCurrentPos({ x: anchorX, y: newY, width: newWidth, height: newHeight });

    // Force re-render
    rect.getLayer()?.batchDraw();
  };

  const handleResizeEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true; // Prevent drag propagation
    setIsResizing(false);

    const rect = shapeRef.current;
    if (!rect) return;

    // Update rectangle in context with final dimensions and position
    // (Y position changes with top-right resize)
    updateRectangle(rectangle.id, {
      y: rect.y(),
      width: rect.width(),
      height: rect.height(),
      lastModifiedBy: rectangle.createdBy,
    });
  };

  return (
    <Group>
      {/* Main Rectangle */}
      <Rect
        ref={shapeRef}
        x={rectangle.x}
        y={rectangle.y}
        width={rectangle.width}
        height={rectangle.height}
        fill={rectangle.color}
        stroke={isSelected ? '#1565C0' : undefined} // Dark blue outline when selected
        strokeWidth={isSelected ? 4 : 0} // Thicker stroke for visibility
        strokeScaleEnabled={false} // Keep stroke width constant when zooming
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        shadowColor="black"
        shadowBlur={isDragging ? 10 : 0}
        shadowOpacity={isDragging ? 0.3 : 0}
        shadowOffsetX={isDragging ? 5 : 0}
        shadowOffsetY={isDragging ? 5 : 0}
        perfectDrawEnabled={false} // Better performance
      />

      {/* Resize Handle - Only visible when selected (top-right corner) */}
      {isSelected && (
        <>
          <Circle
            x={currentPos.x + currentPos.width}
            y={currentPos.y}
            radius={10} // Larger radius for easier grabbing
            fill="#1565C0" // Blue fill for better visibility
            stroke="white"
            strokeWidth={2}
            draggable
            dragBoundFunc={(pos) => {
              // Constrain handle to stay within bounds
              return {
                x: Math.max(currentPos.x + MIN_RECT_SIZE, Math.min(currentPos.x + MAX_RECT_SIZE, pos.x)),
                y: Math.max(currentPos.y - MAX_RECT_SIZE, Math.min(currentPos.y + currentPos.height - MIN_RECT_SIZE, pos.y))
              };
            }}
            onDragStart={handleResizeStart}
            onDragMove={handleResizeMove}
            onDragEnd={handleResizeEnd}
            onMouseEnter={() => {
              document.body.style.cursor = 'nesw-resize'; // Diagonal cursor for top-right
            }}
            onMouseLeave={() => {
              document.body.style.cursor = 'default';
            }}
            perfectDrawEnabled={false}
          />
        </>
      )}
    </Group>
  );
};
