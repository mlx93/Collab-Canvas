// Rectangle component for Konva canvas
import React, { useRef, useState } from 'react';
import { Rect, Circle, Group } from 'react-konva';
import Konva from 'konva';
import { Rectangle as RectangleType } from '../../types/canvas.types';
import { MIN_RECT_SIZE, MAX_RECT_SIZE } from '../../utils/constants';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';

interface RectangleProps {
  rectangle: RectangleType;
  isSelected: boolean;
  onSelect: () => void;
}

const RectangleComponent: React.FC<RectangleProps> = ({ rectangle, isSelected, onSelect }) => {
  const { updateRectangle } = useCanvas();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [, forceUpdate] = useState({});
  const shapeRef = useRef<Konva.Rect>(null);
  const handleRef = useRef<Konva.Circle>(null);
  
  // Calculate current position from either the ref (during drag/resize) or props
  const getCurrentPos = () => {
    const rect = shapeRef.current;
    if ((isDragging || isResizing) && rect) {
      return { x: rect.x(), y: rect.y(), width: rect.width(), height: rect.height() };
    }
    return { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height };
  };
  
  const currentPos = getCurrentPos();

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag move - position is automatically tracked via getCurrentPos()
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Force React re-render to update handle position
    forceUpdate({});
  };

  // Handle drag end - update position in context
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    const node = e.target;
    updateRectangle(rectangle.id, {
      x: node.x(),
      y: node.y(),
      lastModifiedBy: user?.email || rectangle.createdBy,
    });
  };

  // Handle resize via bottom-right handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true; // Prevent drag propagation
    setIsResizing(true);
    
    // Attach mouse move and mouse up listeners to the stage
    const stage = e.target.getStage();
    const rect = shapeRef.current;
    if (!stage || !rect) return;

    // Store initial state when resize starts
    const initialPointerPos = stage.getPointerPosition();
    if (!initialPointerPos) return;

    const initialWidth = rect.width();
    const initialHeight = rect.height();
    const anchorY = rect.y() + rect.height(); // Bottom edge stays fixed (for top-right handle)

    const handleMouseMove = () => {
      const handle = handleRef.current;
      if (!rect || !stage || !handle) return;

      // Get the current pointer position
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // Calculate delta from initial click position
      const deltaX = pointerPos.x - initialPointerPos.x;
      const deltaY = pointerPos.y - initialPointerPos.y;

      // Calculate new dimensions based on deltas
      const newWidth = Math.max(MIN_RECT_SIZE, Math.min(MAX_RECT_SIZE, initialWidth + deltaX));
      const newHeight = Math.max(MIN_RECT_SIZE, Math.min(MAX_RECT_SIZE, initialHeight - deltaY));
      
      // New Y position (top edge moves when height changes)
      const newY = anchorY - newHeight;

      // Update the rectangle dimensions and position immediately for visual feedback
      rect.y(newY);
      rect.width(newWidth);
      rect.height(newHeight);

      // Force React re-render to update handle position (calculated via getCurrentPos())
      forceUpdate({});
      
      // Force Konva re-render for smooth animation
      rect.getLayer()?.batchDraw();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      
      // Finalize the resize
      if (rect) {
        updateRectangle(rectangle.id, {
          y: rect.y(),
          width: rect.width(),
          height: rect.height(),
          lastModifiedBy: user?.email || rectangle.createdBy,
        });
      }
    };

    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
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
            ref={handleRef}
            x={currentPos.x + currentPos.width}
            y={currentPos.y}
            radius={10} // Larger radius for easier grabbing
            fill="#1565C0" // Blue fill for better visibility
            stroke="white"
            strokeWidth={2}
            onMouseDown={handleResizeStart}
            onMouseEnter={() => {
              document.body.style.cursor = 'nesw-resize'; // Diagonal cursor for top-right
            }}
            onMouseLeave={() => {
              document.body.style.cursor = 'default';
            }}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            hitStrokeWidth={20}
          />
        </>
      )}
    </Group>
  );
};

// Memoize the Rectangle component to prevent unnecessary re-renders
// Only re-render when rectangle properties or selection state changes
export const Rectangle = React.memo(RectangleComponent, (prevProps, nextProps) => {
  // Check if rectangle data changed
  const rectChanged = 
    prevProps.rectangle.id !== nextProps.rectangle.id ||
    prevProps.rectangle.x !== nextProps.rectangle.x ||
    prevProps.rectangle.y !== nextProps.rectangle.y ||
    prevProps.rectangle.width !== nextProps.rectangle.width ||
    prevProps.rectangle.height !== nextProps.rectangle.height ||
    prevProps.rectangle.color !== nextProps.rectangle.color ||
    prevProps.rectangle.zIndex !== nextProps.rectangle.zIndex;
  
  // Check if selection state changed
  const selectionChanged = prevProps.isSelected !== nextProps.isSelected;
  
  // Only re-render if something actually changed
  return !rectChanged && !selectionChanged;
});
