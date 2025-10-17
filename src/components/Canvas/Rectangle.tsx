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
  createActiveEditData,
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
  onSelect: (e?: any) => void;
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;
  updateOwnCursor?: (x: number, y: number) => void;
  onMultiDragStart?: (shapeId: string, x: number, y: number) => void;
  onMultiDragUpdate?: (shapeId: string, x: number, y: number) => void;
  onMultiDragEnd?: () => void;
  multiDragPosition?: { x: number; y: number };
  onOptimisticActiveEdit?: (shapeId: string, activeEdit: any) => void;
  onOptimisticClearActiveEdit?: (shapeId: string) => void;
}

const RectangleComponent: React.FC<RectangleProps> = ({ 
  rectangle, 
  isSelected, 
  onSelect, 
  showIndicator = true,
  renderOnlyIndicator = false,
  updateOwnCursor,
  onMultiDragStart,
  onMultiDragUpdate,
  onMultiDragEnd,
  multiDragPosition,
  onOptimisticActiveEdit,
  onOptimisticClearActiveEdit
}) => {
  const { updateShape, viewport, rectangles } = useCanvas();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDimensions, setResizeDimensions] = useState<{ y: number; width: number; height: number } | null>(null);
  const [immediateDragPosition, setImmediateDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const shapeRef = useRef<Konva.Rect>(null);
  const handleRef = useRef<Konva.Circle>(null);
  const newZIndexRef = useRef<number | null>(null); // Store calculated z-index for this edit session
  
  // Throttled function for live position updates (250 FPS for near-perfect synchronization)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number, zIndex?: number) => {
      setLivePosition(shapeId, userId, x, y, width, height, zIndex);
    }, 4)
  );

  // Force node position update when multiDragPosition changes (for multi-select dragging)
  useEffect(() => {
    if (multiDragPosition && !isDragging && shapeRef.current) {
      shapeRef.current.position({ x: multiDragPosition.x, y: multiDragPosition.y });
      shapeRef.current.getLayer()?.batchDraw(); // Redraw the layer
    }
  }, [multiDragPosition, isDragging, rectangle.id]);
  
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
  
  // Shape position (for actual shape rendering) - excludes immediate drag position
  const shapePos = livePosition && livePosition.userId !== user?.userId
    ? { 
        x: livePosition.x, 
        y: livePosition.y, 
        width: livePosition.width, 
        height: livePosition.height,
        zIndex: livePosition.zIndex !== undefined ? livePosition.zIndex : rectangle.zIndex 
      }
    : multiDragPosition && !isDragging
    ? {
        x: multiDragPosition.x,
        y: multiDragPosition.y,
        width: rectangle.width,
        height: rectangle.height,
        zIndex: newZIndexRef.current !== null ? newZIndexRef.current : rectangle.zIndex
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

  // Indicator position (for editing indicators) - includes immediate drag position for smooth movement
  const indicatorPos = immediateDragPosition && isDragging
    ? {
        x: immediateDragPosition.x,
        y: immediateDragPosition.y,
        width: rectangle.width,
        height: rectangle.height,
        zIndex: newZIndexRef.current !== null ? newZIndexRef.current : rectangle.zIndex
      }
    : shapePos;

  // Handle drag start
  const handleDragStart = () => {
    if (!user?.userId || !user?.email) return;
    setIsDragging(true);
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    const cursorColor = getUserCursorColor(user.email);
    const firstName = user.firstName || user.email.split('@')[0];
    
    // Optimistic update: immediately show edit indicator locally
    if (onOptimisticActiveEdit) {
      const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'moving', cursorColor);
      onOptimisticActiveEdit(rectangle.id, activeEditData);
    }
    
    // Async update: sync to RTDB for other users
    setActiveEdit(rectangle.id, user.userId, user.email, firstName, 'moving', cursorColor);
    
    // Only select the shape if it's not already selected (preserves multi-selection)
    if (!isSelected) {
      onSelect();
    }
    
    // Start multi-drag if this shape is part of a multi-selection
    if (onMultiDragStart) {
      onMultiDragStart(rectangle.id, rectangle.x, rectangle.y);
    }
  };

  // Handle drag move - stream live position to RTDB (100 FPS) + update cursor position
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    const node = e.target;
    const stage = node.getStage();
    const x = node.x();
    const y = node.y();
    
    // Store immediate drag position for instant indicator updates
    setImmediateDragPosition({ x, y });
    
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
        // Cache viewport values for better performance
        const { x: vx, y: vy, scale } = viewport;
        const canvasX = (pointerPos.x - vx) / scale;
        const canvasY = (pointerPos.y - vy) / scale;
        updateOwnCursor(canvasX, canvasY);
      }
    }
    
    // Update multi-drag if this shape is part of a multi-selection
    if (onMultiDragUpdate) {
      onMultiDragUpdate(rectangle.id, x, y);
    }
    
    // Stream individual live position for leader shape during multi-drag
    // Follower shapes are handled by the multi-drag system
    if (!multiDragPosition || isDragging) {
      throttledLivePositionUpdate.current(
        rectangle.id,
        user.userId,
        x,
        y,
        rectangle.width,
        rectangle.height,
        newZIndexRef.current !== null ? newZIndexRef.current : undefined
      );
    }
  };

  // Handle drag end - update position in context
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    setIsDragging(false);
    setImmediateDragPosition(null);
    
    const node = e.target;
    const x = node.x();
    const y = node.y();
    
    // Update shape in Firestore
    await updateShape(rectangle.id, { x, y, lastModifiedBy: user?.email || rectangle.createdBy });
    
    // Clear z-index ref
    newZIndexRef.current = null;
    
    // End multi-drag if this shape was part of a multi-selection
    if (onMultiDragEnd) {
      onMultiDragEnd();
      // Don't clear active edit here - endMultiDrag will handle cleanup for all selected shapes
    } else {
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(rectangle.id);
      }
      // Async update: clear from RTDB for other users
      clearActiveEdit(rectangle.id);
    }
  };

  // Handle resize via bottom-right handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true; // Prevent drag propagation
    setIsResizing(true);
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    // Set active edit state
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      const firstName = user.firstName || user.email.split('@')[0];
      
      // Optimistic update: immediately show edit indicator locally
      if (onOptimisticActiveEdit) {
        const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'resizing', cursorColor);
        onOptimisticActiveEdit(rectangle.id, activeEditData);
      }
      
      // Async update: sync to RTDB for other users
      setActiveEdit(rectangle.id, user.userId, user.email, firstName, 'resizing', cursorColor);
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
      await updateShape(rectangle.id, {
        y: finalY,
        width: finalWidth,
        height: finalHeight,
        lastModifiedBy: user?.email || rectangle.createdBy,
      });
      
      // Clear z-index ref
      newZIndexRef.current = null;
      
      // Clear active edit state
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(rectangle.id);
      }
      // Async update: clear from RTDB for other users
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
        rectangleX={indicatorPos.x}
        rectangleY={indicatorPos.y}
        rectangleWidth={indicatorPos.width}
        scale={viewport.scale}
      />
    ) : null;
  }

  // Don't render if shape is hidden
  if (rectangle.visible === false) {
    return null;
  }

  // Otherwise, render the full rectangle (without indicator if showIndicator is false)
  return (
    <Group>
      {/* Main Rectangle */}
      <Rect
        ref={shapeRef}
        x={shapePos.x}
        y={shapePos.y}
        width={shapePos.width}
        height={shapePos.height}
        fill={rectangle.color}
        opacity={rectangle.opacity ?? 1} // Default to 1 for existing rectangles
        rotation={rectangle.rotation ?? 0} // Default to 0 for existing rectangles
        stroke={isSelected ? '#1565C0' : undefined} // Dark blue outline when selected
        strokeWidth={isSelected ? 4 : 0} // Thicker stroke for visibility
        strokeScaleEnabled={false} // Keep stroke width constant when zooming
        draggable={!rectangle.locked && !livePosition && (!multiDragPosition || isDragging)} // Disable dragging if locked, showing live position, or follower in multi-drag
        onClick={(e) => onSelect(e)}
        onTap={(e) => onSelect(e)}
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

      {/* Resize Handle - Only visible when selected and not locked (top-right corner) */}
      {isSelected && !rectangle.locked && (
        <>
          <Circle
            ref={handleRef}
            x={shapePos.x + shapePos.width}
            y={shapePos.y}
            radius={10} // Larger radius for easier grabbing
            fill="#1565C0" // Blue fill for better visibility
            stroke="white"
            strokeWidth={2}
            onMouseDown={handleResizeStart}
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
  
  // Check if multiDragPosition changed (for multi-select dragging)
  const multiDragChanged = prevProps.multiDragPosition?.x !== nextProps.multiDragPosition?.x ||
    prevProps.multiDragPosition?.y !== nextProps.multiDragPosition?.y;
  
  // Only re-render if something actually changed
  return !rectChanged && !selectionChanged && !multiDragChanged;
});
