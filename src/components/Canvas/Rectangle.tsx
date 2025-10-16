// Rectangle component for Konva canvas
import React, { useRef, useState, useEffect } from 'react';
import { Rect, Circle, Group } from 'react-konva';
import Konva from 'konva';
import { RectangleShape } from '../../types/canvas.types';
import { MIN_RECT_SIZE, MAX_RECT_SIZE } from '../../utils/constants';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';
import { 
  setActiveEdit, 
  clearActiveEdit, 
  subscribeToActiveEdit, 
  getUserCursorColor,
  ActiveEdit 
} from '../../services/activeEdits.service';
import {
  setLivePosition,
  subscribeToShapeLivePosition,
  LivePosition
} from '../../services/livePositions.service';
import { throttle } from '../../utils/throttle';
import { EditingIndicator } from '../Collaboration/EditingIndicator';

interface RectangleProps {
  rectangle: RectangleShape;
  isSelected: boolean;
  onSelect: () => void;
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;
  updateOwnCursor?: (x: number, y: number) => void;
}

const RectangleComponent: React.FC<RectangleProps> = ({ 
  rectangle, 
  isSelected, 
  onSelect, 
  showIndicator = true,
  renderOnlyIndicator = false,
  updateOwnCursor
}) => {
  const { updateRectangle, viewport, rectangles } = useCanvas();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDimensions, setResizeDimensions] = useState<{ y: number; width: number; height: number } | null>(null);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const shapeRef = useRef<Konva.Rect>(null);
  const handleRef = useRef<Konva.Circle>(null);
  const newZIndexRef = useRef<number | null>(null); // Store calculated z-index for this edit session
  
  // Throttled function for live position updates (60 FPS)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number, zIndex?: number) => {
      setLivePosition(shapeId, userId, x, y, width, height, zIndex);
    }, 16)
  );
  
  // Subscribe to active edits for this shape
  useEffect(() => {
    const unsubscribe = subscribeToActiveEdit(rectangle.id, (edit) => {
      // Only show indicator if it's NOT the current user
      if (edit && edit.userId !== user?.userId) {
        setActiveEditState(edit);
      } else {
        setActiveEditState(null);
      }
    });
    
    return unsubscribe;
  }, [rectangle.id, user?.userId]);
  
  // Subscribe to live positions ONLY when another user is actively editing this shape
  // This dramatically reduces RTDB subscriptions (from 100+ to ~1-2 at a time)
  useEffect(() => {
    // Only subscribe if another user is actively editing this shape
    if (!activeEdit) {
      // No one is editing - clear any stale live position state
      setLivePositionState(null);
      return;
    }
    
    console.log('[Rectangle] Subscribing to live position for shape being edited by:', activeEdit.userId);
    let clearTimer: NodeJS.Timeout | null = null;
    
    // Subscribe to just THIS shape's live position
    const unsubscribe = subscribeToShapeLivePosition(rectangle.id, (livePositionData) => {
      console.log('[Rectangle] Live position update for', rectangle.id, ':', livePositionData ? 'YES' : 'NO');
      
      if (livePositionData && livePositionData.userId !== user?.userId) {
        console.log('[Rectangle] Using live position from another user:', livePositionData.userId);
        if (clearTimer) {
          clearTimeout(clearTimer);
          clearTimer = null;
        }
        setLivePositionState(livePositionData);
      } else if (livePositionData && livePositionData.userId === user?.userId) {
        // If it's our own live position, clear it after a grace period
        if (!clearTimer) {
          clearTimer = setTimeout(() => {
            setLivePositionState(null);
            clearTimer = null;
          }, 1000);
        }
      } else {
        // Live position cleared by other user
        setLivePositionState(null);
      }
    });
    
    return () => {
      unsubscribe();
      setLivePositionState(null);
    };
  }, [rectangle.id, user?.userId, activeEdit]);
  
  // Use live position if available, or resize dimensions if actively resizing
  const currentPos = livePosition && livePosition.userId !== user?.userId
    ? { 
        x: livePosition.x, 
        y: livePosition.y, 
        width: livePosition.width, 
        height: livePosition.height,
        zIndex: livePosition.zIndex !== undefined ? livePosition.zIndex : rectangle.zIndex 
      }
    : resizeDimensions && isResizing
    ? { 
        x: rectangle.x, 
        y: resizeDimensions.y, 
        width: resizeDimensions.width, 
        height: resizeDimensions.height,
        zIndex: newZIndexRef.current !== null ? newZIndexRef.current : rectangle.zIndex 
      }
    : { 
        x: rectangle.x, 
        y: rectangle.y, 
        width: rectangle.width, 
        height: rectangle.height,
        zIndex: rectangle.zIndex 
      };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    
    // Select the shape when starting to drag
    onSelect();
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    // Set active edit state in RTDB
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      setActiveEdit(rectangle.id, user.userId, user.email, user.firstName, 'moving', cursorColor);
    }
  };

  // Handle drag move - stream live position to RTDB (60 FPS) + update cursor to actual mouse position
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const stage = node.getStage();
    const x = node.x();
    const y = node.y();
    
    console.log('[Rectangle] handleDragMove called for', rectangle.id, 'at', x, y);
    
    // Update resize handle position during drag (top-right corner)
    if (handleRef.current) {
      handleRef.current.x(x + rectangle.width);
      handleRef.current.y(y); // Keep at top edge, not bottom
    }
    
    // Update cursor to actual mouse position in canvas coordinates
    if (updateOwnCursor && stage) {
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        // Convert screen coordinates to canvas coordinates (account for pan/zoom)
        const canvasX = (pointerPos.x - viewport.x) / viewport.scale;
        const canvasY = (pointerPos.y - viewport.y) / viewport.scale;
        updateOwnCursor(canvasX, canvasY);
      }
    }
    
    // Stream live position (with z-index) to RTDB (throttled to 16ms / 60 FPS)
    if (user) {
      throttledLivePositionUpdate.current(
        rectangle.id,
        user.userId,
        x,
        y,
        rectangle.width,
        rectangle.height,
        newZIndexRef.current !== null ? newZIndexRef.current : undefined
      );
    } else {
      console.log('[Rectangle] No user, skipping live position update');
    }
    
    // Force React re-render to update handle position
    forceUpdate({});
  };

  // Handle drag end - update position in context
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    const node = e.target;
    
    // Wait for Firestore update to propagate before clearing active edit
    // This ensures Browser 2 has the new rectangle props from Firestore
    // When clearActiveEdit() removes the live position, Browser 2 falls back to the NEW props (no flicker)
    await updateRectangle(rectangle.id, {
      x: node.x(),
      y: node.y(),
      lastModifiedBy: user?.email || rectangle.createdBy,
    });
    
    // Clear z-index ref
    newZIndexRef.current = null;
    
    // Clear active edit state after Firestore propagates
    clearActiveEdit(rectangle.id);
  };

  // Handle resize via bottom-right handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true; // Prevent drag propagation
    setIsResizing(true);
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    // Set active edit state in RTDB
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      setActiveEdit(rectangle.id, user.userId, user.email, user.firstName, 'resizing', cursorColor);
    }
    
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

      // Update resize dimensions for visual feedback
      setResizeDimensions({ y: newY, width: newWidth, height: newHeight });

      // Update handle position
      handle.x(rect.x() + newWidth);
      handle.y(newY);

      // Stream live position (with z-index) to RTDB (throttled to 16ms / 60 FPS)
      if (user) {
        throttledLivePositionUpdate.current(
          rectangle.id,
          user.userId,
          rect.x(),
          newY,
          newWidth,
          newHeight,
          newZIndexRef.current !== null ? newZIndexRef.current : undefined
        );
      }

      // Force React re-render
      forceUpdate({});
    };

    const handleMouseUp = async () => {
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      
      if (!rect) return;
      
      const handle = handleRef.current;
      if (!handle) return;
      
      const finalY = handle.y();
      const finalWidth = handle.x() - rect.x();
      const finalHeight = anchorY - finalY;
      
      // Clear resize dimensions
      setResizeDimensions(null);
      
      // Wait for Firestore update to propagate before clearing active edit
      // This ensures Browser 2 has the new rectangle props from Firestore
      // When clearActiveEdit() removes the live position, Browser 2 falls back to the NEW props (no flicker)
      await updateRectangle(rectangle.id, {
        y: finalY,
        width: finalWidth,
        height: finalHeight,
        lastModifiedBy: user?.email || rectangle.createdBy,
      });
      
      // Clear z-index ref
      newZIndexRef.current = null;
      
      // Clear active edit state after Firestore propagates
      clearActiveEdit(rectangle.id);
      setIsResizing(false);
    };

    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
  };

  // If only rendering indicator, just return the indicator
  if (renderOnlyIndicator) {
    return activeEdit && showIndicator ? (
      <EditingIndicator
        activeEdit={activeEdit}
        rectangleX={currentPos.x}
        rectangleY={currentPos.y}
        rectangleWidth={currentPos.width}
        scale={viewport.scale}
      />
    ) : null;
  }

  // Otherwise, render the full rectangle (without indicator if showIndicator is false)
  return (
    <Group>
      {/* Main Rectangle */}
      <Rect
        ref={shapeRef}
        x={currentPos.x}
        y={currentPos.y}
        width={currentPos.width}
        height={currentPos.height}
        fill={rectangle.color}
        opacity={rectangle.opacity ?? 1} // Default to 1 for existing rectangles
        rotation={rectangle.rotation ?? 0} // Default to 0 for existing rectangles
        stroke={isSelected ? '#1565C0' : undefined} // Dark blue outline when selected
        strokeWidth={isSelected ? 4 : 0} // Thicker stroke for visibility
        strokeScaleEnabled={false} // Keep stroke width constant when zooming
        draggable={!livePosition} // Disable dragging if showing live position from another user
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
