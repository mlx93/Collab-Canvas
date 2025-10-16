import React, { useRef, useState, useEffect } from 'react';
import { Line as KonvaLine, Circle as KonvaCircle } from 'react-konva';
import Konva from 'konva';
import { TriangleShape } from '../../types/canvas.types';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';
import { 
  setActiveEdit, 
  clearActiveEdit, 
  subscribeToActiveEdit, 
  ActiveEdit,
  getUserCursorColor 
} from '../../services/activeEdits.service';
import {
  setLivePosition,
  clearLivePosition,
  subscribeToShapeLivePosition,
  LivePosition
} from '../../services/livePositions.service';
import { throttle } from '../../utils/throttle';
import { EditingIndicator } from '../Collaboration/EditingIndicator';

interface TriangleProps {
  triangle: TriangleShape;
  isSelected: boolean;
  onSelect: () => void;
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;
  updateOwnCursor?: (x: number, y: number) => void;
}

const MIN_SIZE = 20;
const MAX_SIZE = 500;

const TriangleComponent: React.FC<TriangleProps> = ({ 
  triangle, 
  isSelected, 
  onSelect, 
  showIndicator = true,
  renderOnlyIndicator = false,
  updateOwnCursor
}) => {
  const { updateRectangle, viewport } = useCanvas();
  const { user } = useAuth();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDimensions, setResizeDimensions] = useState<{ width: number; height: number } | null>(null);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const triangleRef = useRef<Konva.Line>(null);
  const handleRef = useRef<Konva.Circle>(null);
  const livePositionTimestampRef = useRef<number>(0);
  
  // Throttled function for live position updates (60 FPS)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number) => {
      setLivePosition(shapeId, userId, x, y, width, height);
    }, 16)
  );
  
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
    
    const currentPos = livePosition && livePosition.userId !== user?.userId
      ? { x: livePosition.x, y: livePosition.y, width: livePosition.width, height: livePosition.height }
      : { x: triangle.x, y: triangle.y, width: triangle.width, height: triangle.height };
    
    return (
      <EditingIndicator
        activeEdit={activeEdit}
        rectangleX={currentPos.x}
        rectangleY={currentPos.y}
        rectangleWidth={currentPos.width}
        scale={viewport.scale}
      />
    );
  }

  // Use live position if available, or resize dimensions if actively resizing
  const currentPos = livePosition && livePosition.userId !== user?.userId
    ? { x: livePosition.x, y: livePosition.y, width: livePosition.width, height: livePosition.height }
    : resizeDimensions && isResizing
    ? { x: triangle.x, y: triangle.y, width: resizeDimensions.width, height: resizeDimensions.height }
    : { x: triangle.x, y: triangle.y, width: triangle.width, height: triangle.height };

  // Calculate triangle points (points up)
  const points = [
    currentPos.width / 2, 0,  // Top center
    currentPos.width, currentPos.height,  // Bottom right
    0, currentPos.height  // Bottom left
  ];

  const handleDragStart = () => {
    if (!user?.userId || !user?.email) return;
    const cursorColor = getUserCursorColor(user.email);
    const firstName = user.firstName || user.email.split('@')[0];
    setActiveEdit(triangle.id, user.userId, user.email, firstName, 'moving', cursorColor);
    onSelect();
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    const node = e.target;
    const x = node.x();
    const y = node.y();
    
    // Update resize handle position during drag
    if (handleRef.current) {
      handleRef.current.x(x + triangle.width);
      handleRef.current.y(y + triangle.height);
    }
    
    // Stream live position to other users
    throttledLivePositionUpdate.current(triangle.id, user.userId, x, y, triangle.width, triangle.height);
    
    // Update own cursor position to center of triangle
    if (updateOwnCursor) {
      const centerX = x + triangle.width / 2;
      const centerY = y + triangle.height / 2;
      updateOwnCursor(centerX, centerY);
    }
    
    forceUpdate({});
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    
    const node = e.target;
    const x = node.x();
    const y = node.y();
    
    await updateRectangle(triangle.id, { x, y, lastModifiedBy: user?.email || triangle.createdBy });
    
    clearLivePosition(triangle.id);
    clearActiveEdit(triangle.id);
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect();
  };

  // Handle resize via bottom-right corner handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setIsResizing(true);
    
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      const firstName = user.firstName || user.email.split('@')[0];
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
      
      // Stream live position to RTDB
      if (user) {
        throttledLivePositionUpdate.current(
          triangle.id,
          user.userId,
          anchorX,
          anchorY,
          newWidth,
          newHeight
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
      
      await updateRectangle(triangle.id, {
        width: finalWidth,
        height: finalHeight,
        lastModifiedBy: user?.email || triangle.createdBy,
      });
      
      clearActiveEdit(triangle.id);
      setIsResizing(false);
    };

    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Main triangle */}
      <KonvaLine
        ref={triangleRef}
        x={currentPos.x}
        y={currentPos.y}
        points={points}
        fill={triangle.color}
        opacity={triangle.opacity ?? 1}
        rotation={triangle.rotation ?? 0}
        closed={true}
        draggable={!livePosition && !triangle.locked && !isResizing}
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
      
      {/* Resize handle (bottom-right corner) */}
      {isSelected && !livePosition && (
        <KonvaCircle
          ref={handleRef}
          x={currentPos.x + currentPos.width}
          y={currentPos.y + currentPos.height}
          radius={8}
          fill="#2196F3"
          stroke="#FFFFFF"
          strokeWidth={2}
          onMouseDown={handleResizeStart}
          draggable={false}
          perfectDrawEnabled={false}
        />
      )}
      
      {/* Editing indicator */}
      {showIndicator && activeEdit && activeEdit.userId !== user?.userId && (
        <EditingIndicator
          activeEdit={activeEdit}
          rectangleX={currentPos.x}
          rectangleY={currentPos.y}
          rectangleWidth={currentPos.width}
          scale={viewport.scale}
        />
      )}
    </>
  );
};

export default React.memo(TriangleComponent);

