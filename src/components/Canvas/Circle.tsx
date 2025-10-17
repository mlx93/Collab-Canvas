// Circle component for Konva canvas
import React, { useRef, useState, useEffect } from 'react';
import { Circle as KonvaCircle } from 'react-konva';
import Konva from 'konva';
import { CircleShape } from '../../types/canvas.types';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';
import { 
  setActiveEdit, 
  clearActiveEdit, 
  subscribeToActiveEdit, 
  ActiveEdit,
  getUserCursorColor,
  createActiveEditData
} from '../../services/activeEdits.service';
import {
  setLivePosition,
  subscribeToShapeLivePosition,
  LivePosition
} from '../../services/livePositions.service';
import { throttle } from '../../utils/throttle';
import { EditingIndicator } from '../Collaboration/EditingIndicator';

export interface CircleProps {
  circle: CircleShape;
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

const MIN_RADIUS = 10;
const MAX_RADIUS = 500;

const CircleComponent: React.FC<CircleProps> = ({ 
  circle, 
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
  const { updateRectangle, viewport, rectangles } = useCanvas();
  const { user } = useAuth();
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [immediateDragPosition, setImmediateDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const circleRef = useRef<Konva.Circle>(null);
  const handleRef = useRef<Konva.Circle>(null);
  const newZIndexRef = useRef<number | null>(null); // Store calculated z-index for this edit session
  
  // Throttled function for live position updates (120 FPS for ultra-smooth indicators)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, radius: number, zIndex?: number) => {
      setLivePosition(shapeId, userId, x, y, radius, radius, zIndex); // width/height both set to radius for circles
    }, 8)
  );

  // Force node position update when multiDragPosition changes (for multi-select dragging)
  useEffect(() => {
    if (multiDragPosition && !isDragging && circleRef.current) {
      circleRef.current.position({ x: multiDragPosition.x, y: multiDragPosition.y });
      circleRef.current.getLayer()?.batchDraw();
    }
  }, [multiDragPosition, isDragging]);
  
  // Subscribe to active edits for this shape
  useEffect(() => {
    const unsubscribe = subscribeToActiveEdit(circle.id, (edit) => {
      if (edit && edit.userId !== user?.userId) {
        setActiveEditState(edit);
      } else {
        setActiveEditState(null);
      }
    });
    
    return unsubscribe;
  }, [circle.id, user?.userId]);
  
  // Subscribe to live positions when another user is editing
  useEffect(() => {
    if (!activeEdit) {
      setLivePositionState(null);
      return;
    }
    
    const unsubscribe = subscribeToShapeLivePosition(circle.id, (livePositionData) => {
      if (livePositionData && livePositionData.userId !== user?.userId) {
        setLivePositionState(livePositionData);
      } else {
        setLivePositionState(null);
      }
    });
    
    return () => {
      unsubscribe();
      setLivePositionState(null);
    };
  }, [circle.id, user?.userId, activeEdit]);
  
  // Render only indicator (for indicators layer)
  if (renderOnlyIndicator) {
    if (!showIndicator || !activeEdit || activeEdit.userId === user?.userId) {
      return null;
    }
    
    const indicatorPos = livePosition && livePosition.userId !== user?.userId
      ? { x: livePosition.x, y: livePosition.y, radius: livePosition.width }
      : { x: circle.x, y: circle.y, radius: circle.radius };
    
    console.log('Circle editing indicator:', { 
      circleId: circle.id, 
      livePosition, 
      circleRadius: circle.radius, 
      indicatorPos, 
      editingIndicatorWidth: indicatorPos.radius * 2
    });
    
    return (
      <EditingIndicator
        activeEdit={activeEdit}
        rectangleX={indicatorPos.x}
        rectangleY={indicatorPos.y - indicatorPos.radius}
        rectangleWidth={indicatorPos.radius * 2}
        rectangleHeight={indicatorPos.radius * 2}
        scale={viewport.scale}
      />
    );
  }

  // Shape position (for actual shape rendering) - excludes immediate drag position
  const shapePos = livePosition && livePosition.userId !== user?.userId
    ? { x: livePosition.x, y: livePosition.y, radius: livePosition.width } // width represents radius for circles
    : multiDragPosition && !isDragging
    ? { x: multiDragPosition.x, y: multiDragPosition.y, radius: circle.radius }
    : { x: circle.x, y: circle.y, radius: circle.radius };

  // Indicator position (for editing indicators) - includes immediate drag position for smooth movement
  const indicatorPos = immediateDragPosition && isDragging
    ? { x: immediateDragPosition.x, y: immediateDragPosition.y, radius: circle.radius }
    : shapePos;

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
      onOptimisticActiveEdit(circle.id, activeEditData);
    }
    
    // Async update: sync to RTDB for other users
    setActiveEdit(circle.id, user.userId, user.email, firstName, 'moving', cursorColor);
    
    // Only select the shape if it's not already selected (preserves multi-selection)
    if (!isSelected) {
      onSelect();
    }
    
    // Start multi-drag if this shape is part of a multi-selection
    if (onMultiDragStart) {
      onMultiDragStart(circle.id, circle.x, circle.y);
    }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    const node = e.target;
    const stage = node.getStage();
    const x = node.x();
    const y = node.y();
    
    // Store immediate drag position for instant indicator updates
    setImmediateDragPosition({ x, y });
    
    // Update resize handle position during drag
    if (handleRef.current) {
      handleRef.current.x(x + circle.radius);
      handleRef.current.y(y);
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
      onMultiDragUpdate(circle.id, x, y);
    }
    
    // Stream individual live position for leader shape during multi-drag
    // Follower shapes are handled by the multi-drag system
    if (!multiDragPosition || isDragging) {
      throttledLivePositionUpdate.current(circle.id, user.userId, x, y, circle.radius, newZIndexRef.current !== null ? newZIndexRef.current : undefined);
    }
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    setIsDragging(false);
    setImmediateDragPosition(null);
    
    const node = e.target;
    const x = node.x();
    const y = node.y();
    
    // Update shape in Firestore
    await updateRectangle(circle.id, { x, y, lastModifiedBy: user?.email || circle.createdBy });
    
    // Clear z-index ref
    newZIndexRef.current = null;
    
    // End multi-drag if this shape was part of a multi-selection
    if (onMultiDragEnd) {
      onMultiDragEnd();
      // Don't clear active edit here - endMultiDrag will handle cleanup for all selected shapes
    } else {
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(circle.id);
      }
      // Async update: clear from RTDB for other users
      clearActiveEdit(circle.id);
    }
  };


  // Handle shape selection
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(e);
  };

  // Handle resize via right-edge handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setIsResizing(true);
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      const firstName = user.firstName || user.email.split('@')[0];
      setActiveEdit(circle.id, user.userId, user.email, firstName, 'resizing', cursorColor);
    }
    
    const stage = e.target.getStage();
    const circleNode = circleRef.current;
    if (!stage || !circleNode) return;

    const initialPointerPos = stage.getPointerPosition();
    if (!initialPointerPos) return;

    const initialRadius = circleNode.radius();
    const centerX = circleNode.x();
    const centerY = circleNode.y();

    const handleMouseMove = () => {
      const handle = handleRef.current;
      if (!circleNode || !stage || !handle) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // Calculate delta from initial click position (similar to rectangle)
      const deltaX = pointerPos.x - initialPointerPos.x;
      
      // New radius = initial radius + horizontal delta
      let newRadius = initialRadius + deltaX;
      newRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, newRadius));

      circleNode.radius(newRadius);
      
      // Update handle position
      handle.x(centerX + newRadius);
      handle.y(centerY);
      
      // Stream live position (with z-index) to RTDB (throttled to 16ms / 60 FPS)
      if (user) {
        throttledLivePositionUpdate.current(
          circle.id,
          user.userId,
          centerX,
          centerY,
          newRadius,
          newZIndexRef.current !== null ? newZIndexRef.current : undefined
        );
      }
      
      forceUpdate({});
    };

    const handleMouseUp = async () => {
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      
      if (!circleNode) return;
      
      const finalRadius = circleNode.radius();
      await updateRectangle(circle.id, {
        radius: finalRadius,
        lastModifiedBy: user?.email || circle.createdBy,
      });
      
      // Clear z-index ref
      newZIndexRef.current = null;
      
      clearActiveEdit(circle.id);
      setIsResizing(false);
    };

    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Main circle */}
      <KonvaCircle
        ref={circleRef}
        x={shapePos.x}
        y={shapePos.y}
        radius={shapePos.radius}
        fill={circle.color}
        opacity={circle.opacity ?? 1}
        rotation={circle.rotation ?? 0}
        draggable={!livePosition && !circle.locked && !isResizing && (!multiDragPosition || isDragging)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTap={handleClick}
        stroke={isSelected ? '#1565C0' : undefined}
        strokeWidth={isSelected ? 4 : 0}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
      />
      
      {/* Resize handle (right edge of circle) */}
      {isSelected && !livePosition && (
        <KonvaCircle
          ref={handleRef}
          x={shapePos.x + shapePos.radius}
          y={shapePos.y}
          radius={8}
          fill="#2196F3"
          stroke="#FFFFFF"
          strokeWidth={2}
          onMouseDown={handleResizeStart}
          draggable={false}
          perfectDrawEnabled={false}
        />
      )}
      
      {/* Editing indicator (who is editing this shape) */}
      {showIndicator && activeEdit && activeEdit.userId !== user?.userId && (
        <>
          {console.log('Circle main editing indicator:', { 
            circleId: circle.id, 
            livePosition, 
            circleRadius: circle.radius, 
            shapePos, 
            editingIndicatorWidth: shapePos.radius * 2,
            rectangleX: shapePos.x,
            rectangleY: shapePos.y - shapePos.radius
          })}
          {/* Editing indicator is rendered in the indicators layer for proper z-index */}
        </>
      )}
    </>
  );
};

export default React.memo(CircleComponent);

