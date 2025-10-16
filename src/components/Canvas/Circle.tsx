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

interface CircleProps {
  circle: CircleShape;
  isSelected: boolean;
  onSelect: () => void;
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;
  updateOwnCursor?: (x: number, y: number) => void;
}

const MIN_RADIUS = 10;
const MAX_RADIUS = 500;

const CircleComponent: React.FC<CircleProps> = ({ 
  circle, 
  isSelected, 
  onSelect, 
  showIndicator = true,
  renderOnlyIndicator = false,
  updateOwnCursor
}) => {
  const { updateRectangle, viewport } = useCanvas();
  const { user } = useAuth();
  const [isResizing, setIsResizing] = useState(false);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const circleRef = useRef<Konva.Circle>(null);
  const handleRef = useRef<Konva.Circle>(null);
  
  // Throttled function for live position updates (60 FPS)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, radius: number) => {
      setLivePosition(shapeId, userId, x, y, radius, radius); // width/height both set to radius for circles
    }, 16)
  );
  
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
    
    const currentPos = livePosition && livePosition.userId !== user?.userId
      ? { x: livePosition.x, y: livePosition.y, radius: livePosition.width }
      : { x: circle.x, y: circle.y, radius: circle.radius };
    
    return (
      <EditingIndicator
        activeEdit={activeEdit}
        rectangleX={currentPos.x}
        rectangleY={currentPos.y - currentPos.radius}
        rectangleWidth={currentPos.radius * 2}
        scale={viewport.scale}
      />
    );
  }

  // Use live position if available (another user is editing), otherwise use circle's stored position
  const currentPos = livePosition && livePosition.userId !== user?.userId
    ? { x: livePosition.x, y: livePosition.y, radius: livePosition.width } // width represents radius for circles
    : { x: circle.x, y: circle.y, radius: circle.radius };

  const handleDragStart = () => {
    if (!user?.userId || !user?.email) return;
    const cursorColor = getUserCursorColor(user.email);
    const firstName = user.firstName || user.email.split('@')[0];
    setActiveEdit(circle.id, user.userId, user.email, firstName, 'moving', cursorColor);
    onSelect();
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    const node = e.target;
    const stage = node.getStage();
    const x = node.x();
    const y = node.y();
    
    // Update resize handle position during drag
    if (handleRef.current) {
      handleRef.current.x(x + circle.radius);
      handleRef.current.y(y);
    }
    
    // Stream live position to other users
    throttledLivePositionUpdate.current(circle.id, user.userId, x, y, circle.radius);
    
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
    
    // Force re-render to update handle
    forceUpdate({});
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!user?.userId) return;
    
    const node = e.target;
    const x = node.x();
    const y = node.y();
    
    // Update shape in Firestore
    await updateRectangle(circle.id, { x, y, lastModifiedBy: user?.email || circle.createdBy });
    
    // Clear live position and active edit
    clearLivePosition(circle.id);
    clearActiveEdit(circle.id);
  };


  // Handle shape selection
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect();
  };

  // Handle resize via right-edge handle
  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setIsResizing(true);
    
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
      
      // Stream live position to RTDB (throttled to 16ms / 60 FPS)
      if (user) {
        throttledLivePositionUpdate.current(
          circle.id,
          user.userId,
          centerX,
          centerY,
          newRadius
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
        x={currentPos.x}
        y={currentPos.y}
        radius={currentPos.radius}
        fill={circle.color}
        opacity={circle.opacity ?? 1}
        rotation={circle.rotation ?? 0}
        draggable={!livePosition && !circle.locked && !isResizing}
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
          x={currentPos.x + currentPos.radius}
          y={currentPos.y}
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
        <EditingIndicator
          activeEdit={activeEdit}
          rectangleX={currentPos.x}
          rectangleY={currentPos.y - currentPos.radius}
          rectangleWidth={currentPos.radius * 2}
          scale={viewport.scale}
        />
      )}
    </>
  );
};

export default React.memo(CircleComponent);

