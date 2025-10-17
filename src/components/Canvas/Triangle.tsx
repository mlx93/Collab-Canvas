import React, { useRef, useState, useEffect } from 'react';
import { Circle as KonvaCircle, Shape as KonvaShape } from 'react-konva';
import Konva from 'konva';
import { TriangleShape } from '../../types/canvas.types';
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

export interface TriangleProps {
  triangle: TriangleShape;
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

const MIN_SIZE = 20;
const MAX_SIZE = 500;

const TriangleComponent: React.FC<TriangleProps> = ({ 
  triangle, 
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
  const [resizeDimensions, setResizeDimensions] = useState<{ width: number; height: number } | null>(null);
  const [immediateDragPosition, setImmediateDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const triangleRef = useRef<Konva.Shape>(null);
  const handleRef = useRef<Konva.Circle>(null);
  const livePositionTimestampRef = useRef<number>(0);
  const newZIndexRef = useRef<number | null>(null); // Store calculated z-index for this edit session
  
  // Throttled function for live position updates (250 FPS for near-perfect synchronization)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number, zIndex?: number) => {
      setLivePosition(shapeId, userId, x, y, width, height, zIndex);
    }, 4)
  );

  // Force node position update when multiDragPosition changes (for multi-select dragging)
  useEffect(() => {
    if (multiDragPosition && !isDragging && triangleRef.current) {
      triangleRef.current.position({ x: multiDragPosition.x, y: multiDragPosition.y });
      triangleRef.current.getLayer()?.batchDraw();
    }
  }, [multiDragPosition, isDragging]);
  
  // Subscribe to active edits for this shape
  useEffect(() => {
    const unsubscribe = subscribeToActiveEdit(triangle.id, (edit) => {
      if (edit && edit.userId !== user?.userId) {
        setActiveEditState(edit);
      } else {
        setActiveEditState(null);
      }
    });
    
    return unsubscribe;
  }, [triangle.id, user?.userId]);
  
  // Subscribe to live positions ONLY when another user is actively editing this shape
  useEffect(() => {
    if (!activeEdit) {
      setLivePositionState(null);
      return;
    }
    
    let clearTimer: NodeJS.Timeout | null = null;
    
    const unsubscribe = subscribeToShapeLivePosition(triangle.id, (livePositionData) => {
      if (livePositionData && livePositionData.userId !== user?.userId) {
        if (clearTimer) {
          clearTimeout(clearTimer);
          clearTimer = null;
        }
        setLivePositionState(livePositionData);
        livePositionTimestampRef.current = Date.now();
      } else if (livePositionData && livePositionData.userId === user?.userId) {
        if (!clearTimer) {
          clearTimer = setTimeout(() => {
            setLivePositionState(null);
            clearTimer = null;
          }, 1000);
        }
      } else {
        setLivePositionState(null);
      }
    });
    
    return () => {
      unsubscribe();
      setLivePositionState(null);
    };
  }, [triangle.id, user?.userId, activeEdit]);
  
  // Update handle position when triangle moves or is selected (must be before early returns)
  useEffect(() => {
    if (!isSelected || !handleRef.current || !triangleRef.current) return;
    
    const triangleNode = triangleRef.current;
    const handle = handleRef.current;
    
    handle.x(triangleNode.x() + triangle.width);
    handle.y(triangleNode.y() + triangle.height);
    
    forceUpdate({});
  }, [isSelected, triangle.x, triangle.y, triangle.width, triangle.height]);
  
  // Render only indicator (for indicators layer)
  if (renderOnlyIndicator) {
    if (!showIndicator || !activeEdit || activeEdit.userId === user?.userId) {
      return null;
    }
    
    const indicatorPos = livePosition && livePosition.userId !== user?.userId
      ? { x: livePosition.x, y: livePosition.y, width: livePosition.width, height: livePosition.height }
      : { x: triangle.x, y: triangle.y, width: triangle.width, height: triangle.height };
    
    return (
      <EditingIndicator
        activeEdit={activeEdit}
        rectangleX={indicatorPos.x}
        rectangleY={indicatorPos.y}
        rectangleWidth={indicatorPos.width}
        scale={viewport.scale}
      />
    );
  }

  // Shape position (for actual shape rendering) - excludes immediate drag position
  const shapePos = livePosition && livePosition.userId !== user?.userId
    ? { x: livePosition.x, y: livePosition.y, width: livePosition.width, height: livePosition.height }
    : multiDragPosition && !isDragging
    ? { x: multiDragPosition.x, y: multiDragPosition.y, width: triangle.width, height: triangle.height }
    : resizeDimensions && isResizing
    ? { x: triangle.x, y: triangle.y, width: resizeDimensions.width, height: resizeDimensions.height }
    : { x: triangle.x, y: triangle.y, width: triangle.width, height: triangle.height };

  // Indicator position (for editing indicators) - includes immediate drag position for smooth movement
  const indicatorPos = immediateDragPosition && isDragging
    ? { x: immediateDragPosition.x, y: immediateDragPosition.y, width: triangle.width, height: triangle.height }
    : shapePos;

  // Calculate triangle points (points up)
  const points = [
    shapePos.width / 2, 0,  // Top center
    shapePos.width, shapePos.height,  // Bottom right
    0, shapePos.height  // Bottom left
  ];

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
      onOptimisticActiveEdit(triangle.id, activeEditData);
    }
    // Async update: sync to RTDB for other users
    setActiveEdit(triangle.id, user.userId, user.email, firstName, 'moving', cursorColor);
    
    // Only select the shape if it's not already selected (preserves multi-selection)
    if (!isSelected) {
      onSelect();
    }
    
    // Start multi-drag if this shape is part of a multi-selection
    if (onMultiDragStart) {
      onMultiDragStart(triangle.id, triangle.x, triangle.y);
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
      handleRef.current.x(x + triangle.width);
      handleRef.current.y(y + triangle.height);
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
      onMultiDragUpdate(triangle.id, x, y);
    }
    
    // Stream individual live position for leader shape during multi-drag
    // Follower shapes are handled by the multi-drag system
    if (!multiDragPosition || isDragging) {
      throttledLivePositionUpdate.current(triangle.id, user.userId, x, y, triangle.width, triangle.height, newZIndexRef.current !== null ? newZIndexRef.current : undefined);
    }
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    setIsDragging(false);
    setImmediateDragPosition(null);
    
    const node = e.target;
    const x = node.x();
    const y = node.y();
    
    await updateShape(triangle.id, { x, y, lastModifiedBy: user?.email || triangle.createdBy });
    
    // Clear z-index ref
    newZIndexRef.current = null;
    
    // End multi-drag if this shape was part of a multi-selection
    if (onMultiDragEnd) {
      onMultiDragEnd();
      // Don't clear active edit here - endMultiDrag will handle cleanup for all selected shapes
    } else {
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(triangle.id);
      }
      // Async update: clear from RTDB for other users
      clearActiveEdit(triangle.id);
    }
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(e);
  };

  // Handle resize via bottom-right corner handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setIsResizing(true);
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      const firstName = user.firstName || user.email.split('@')[0];
      
      // Optimistic update: immediately show edit indicator locally
      if (onOptimisticActiveEdit) {
        const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'resizing', cursorColor);
        onOptimisticActiveEdit(triangle.id, activeEditData);
      }
      // Async update: sync to RTDB for other users
      setActiveEdit(triangle.id, user.userId, user.email, firstName, 'resizing', cursorColor);
    }
    
    const stage = e.target.getStage();
    const triangleNode = triangleRef.current;
    if (!stage || !triangleNode) return;

    const initialPointerPos = stage.getPointerPosition();
    if (!initialPointerPos) return;

    const initialWidth = triangle.width;
    const initialHeight = triangle.height;
    const anchorX = triangleNode.x();
    const anchorY = triangleNode.y();

    const handleMouseMove = () => {
      const handle = handleRef.current;
      if (!triangleNode || !stage || !handle) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // Calculate delta from initial click position
      const deltaX = pointerPos.x - initialPointerPos.x;
      const deltaY = pointerPos.y - initialPointerPos.y;
      
      // New width/height = initial + delta
      let newWidth = initialWidth + deltaX;
      let newHeight = initialHeight + deltaY;
      
      newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newWidth));
      newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newHeight));

      // Update resize dimensions for visual feedback
      setResizeDimensions({ width: newWidth, height: newHeight });

      // Update handle position
      handle.x(anchorX + newWidth);
      handle.y(anchorY + newHeight);
      
      // Stream live position (with z-index) to RTDB
      if (user) {
        throttledLivePositionUpdate.current(
          triangle.id,
          user.userId,
          anchorX,
          anchorY,
          newWidth,
          newHeight,
          newZIndexRef.current !== null ? newZIndexRef.current : undefined
        );
      }
      
      forceUpdate({});
    };

    const handleMouseUp = async () => {
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      
      if (!triangleNode) return;
      
      const handle = handleRef.current;
      if (!handle) return;
      
      const finalWidth = handle.x() - anchorX;
      const finalHeight = handle.y() - anchorY;
      
      // Clear resize dimensions
      setResizeDimensions(null);
      
      await updateShape(triangle.id, {
        width: finalWidth,
        height: finalHeight,
        lastModifiedBy: user?.email || triangle.createdBy,
      });
      
      // Clear z-index ref
      newZIndexRef.current = null;
      
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(triangle.id);
      }
      // Async update: clear from RTDB for other users
      clearActiveEdit(triangle.id);
      setIsResizing(false);
    };

    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Main triangle */}
      <KonvaShape
        ref={triangleRef}
        x={shapePos.x}
        y={shapePos.y}
        fill={triangle.color}
        opacity={triangle.opacity ?? 1}
        rotation={triangle.rotation ?? 0}
        draggable={!livePosition && !triangle.locked && !isResizing && (!multiDragPosition || isDragging)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTap={handleClick}
        stroke={isSelected ? '#1565C0' : undefined}
        strokeWidth={isSelected ? 4 : 0}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        lineJoin="round"
        lineCap="round"
        shadowForStrokeEnabled={false}
        hitStrokeWidth={0}
        sceneFunc={(context, shape) => {
          context.beginPath();
          context.moveTo(points[0], points[1]);
          context.lineTo(points[2], points[3]);
          context.lineTo(points[4], points[5]);
          context.closePath();
          context.fillStrokeShape(shape);
        }}
      />
      
      {/* Resize handle (bottom-right corner) */}
      {isSelected && !livePosition && (
        <KonvaCircle
          ref={handleRef}
          x={shapePos.x + shapePos.width}
          y={shapePos.y + shapePos.height}
          radius={8}
          fill="#2196F3"
          stroke="#FFFFFF"
          strokeWidth={2}
          onMouseDown={handleResizeStart}
          draggable={false}
          perfectDrawEnabled={false}
        />
      )}
      
      {/* Editing indicator is rendered in the indicators layer for proper z-index */}
    </>
  );
};

export default React.memo(TriangleComponent);

