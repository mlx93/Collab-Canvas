// Rectangle component for Konva canvas
import React, { useRef, useState, useEffect } from 'react';
import { Rect, Circle, Group } from 'react-konva';
import Konva from 'konva';
import { Rectangle as RectangleType } from '../../types/canvas.types';
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
  clearLivePosition,
  subscribeToLivePositions,
  LivePosition
} from '../../services/livePositions.service';
import { throttle } from '../../utils/throttle';
import { EditingIndicator } from '../Collaboration/EditingIndicator';

interface RectangleProps {
  rectangle: RectangleType;
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
  const { updateRectangle, viewport } = useCanvas();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const livePositionTimestampRef = useRef<number>(0);
  const shapeRef = useRef<Konva.Rect>(null);
  const handleRef = useRef<Konva.Circle>(null);
  
  // Throttled function for live position updates (60 FPS)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number) => {
      setLivePosition(shapeId, userId, x, y, width, height);
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
  
  // Subscribe to live positions for ALL shapes (to detect if THIS shape is being edited by others)
  useEffect(() => {
    console.log('[Rectangle] Subscribing to live positions for shape:', rectangle.id);
    let clearTimer: NodeJS.Timeout | null = null;
    
    const unsubscribe = subscribeToLivePositions((livePositions) => {
      const positionForThisShape = livePositions[rectangle.id];
      console.log('[Rectangle] Live position update for', rectangle.id, ':', positionForThisShape ? 'YES' : 'NO');
      
      // Only use live position if it's from ANOTHER user (don't override own optimistic updates)
      if (positionForThisShape && positionForThisShape.userId !== user?.userId) {
        console.log('[Rectangle] Using live position from another user:', positionForThisShape.userId);
        
        // Clear any pending clear timer
        if (clearTimer) {
          clearTimeout(clearTimer);
          clearTimer = null;
        }
        
        setLivePositionState(positionForThisShape);
        livePositionTimestampRef.current = Date.now();
      } else if (!positionForThisShape && livePosition) {
        // Live position was removed (user released shape)
        // Keep it for 1 second to allow Firestore update to arrive
        console.log('[Rectangle] Live position cleared, starting grace period');
        livePositionTimestampRef.current = Date.now();
        
        clearTimer = setTimeout(() => {
          console.log('[Rectangle] Grace period expired, clearing live position state');
          setLivePositionState(null);
        }, 1000);
      }
    });
    
    return () => {
      if (clearTimer) clearTimeout(clearTimer);
      unsubscribe();
    };
  }, [rectangle.id, user?.userId, livePosition]);
  
  // Calculate current position from either:
  // 1. Live position from another user (real-time streaming)
  // 2. The ref (during own drag/resize - optimistic update)
  // 3. Props (default state) - but ignore if live position was active within last 500ms (anti-flicker)
  const getCurrentPos = () => {
    // If another user is editing this shape, use their live position
    if (livePosition) {
      return {
        x: livePosition.x,
        y: livePosition.y,
        width: livePosition.width,
        height: livePosition.height
      };
    }
    
    // If we're editing this shape ourselves, use the ref for optimistic updates
    const rect = shapeRef.current;
    if ((isDragging || isResizing) && rect) {
      return { x: rect.x(), y: rect.y(), width: rect.width(), height: rect.height() };
    }
    
    // Default: use rectangle props
    // BUT if live position was recently active (within 1000ms), keep using last known position to prevent flicker
    const timeSinceLastLivePosition = Date.now() - livePositionTimestampRef.current;
    if (timeSinceLastLivePosition > 0 && timeSinceLastLivePosition < 1000) {
      // Use the ref if available (to avoid jumping back to old position during the grace period)
      if (rect) {
        return { x: rect.x(), y: rect.y(), width: rect.width(), height: rect.height() };
      }
    }
    
    // Grace period expired or never set - use props (normal Firestore state)
    // Clear the timestamp so we don't keep using stale ref data
    if (timeSinceLastLivePosition >= 1000 && livePositionTimestampRef.current > 0) {
      livePositionTimestampRef.current = 0;
    }
    
    return { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height };
  };
  
  const currentPos = getCurrentPos();

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    
    // Set active edit state in RTDB
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      setActiveEdit(rectangle.id, user.userId, user.email, user.firstName, 'moving', cursorColor);
    }
  };

  // Handle drag move - stream live position to RTDB (60 FPS) + update cursor to shape center
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    
    console.log('[Rectangle] handleDragMove called for', rectangle.id, 'at', node.x(), node.y());
    
    // Update cursor to center of shape
    if (updateOwnCursor) {
      const centerX = node.x() + rectangle.width / 2;
      const centerY = node.y() + rectangle.height / 2;
      updateOwnCursor(centerX, centerY);
    }
    
    // Stream live position to RTDB (throttled to 16ms / 60 FPS)
    if (user) {
      throttledLivePositionUpdate.current(
        rectangle.id,
        user.userId,
        node.x(),
        node.y(),
        rectangle.width,
        rectangle.height
      );
    } else {
      console.log('[Rectangle] No user, skipping live position update');
    }
    
    // Force React re-render to update handle position
    forceUpdate({});
  };

  // Handle drag end - update position in context and clear live position
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    const node = e.target;
    updateRectangle(rectangle.id, {
      x: node.x(),
      y: node.y(),
      lastModifiedBy: user?.email || rectangle.createdBy,
    });
    
    // Clear active edit state and live position
    clearActiveEdit(rectangle.id);
    clearLivePosition(rectangle.id);
  };

  // Handle resize via bottom-right handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true; // Prevent drag propagation
    setIsResizing(true);
    
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

      // Update the rectangle dimensions and position immediately for visual feedback
      rect.y(newY);
      rect.width(newWidth);
      rect.height(newHeight);

      // Stream live position to RTDB (throttled to 16ms / 60 FPS)
      if (user) {
        throttledLivePositionUpdate.current(
          rectangle.id,
          user.userId,
          rect.x(),
          newY,
          newWidth,
          newHeight
        );
      }

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
      
      // Clear active edit state and live position
      clearActiveEdit(rectangle.id);
      clearLivePosition(rectangle.id);
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
        x={livePosition ? currentPos.x : rectangle.x}
        y={livePosition ? currentPos.y : rectangle.y}
        width={livePosition ? currentPos.width : rectangle.width}
        height={livePosition ? currentPos.height : rectangle.height}
        fill={rectangle.color}
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
