// Line component with Konva.js - supports dual endpoint editing and real-time collaboration
import React, { useRef, useState, useEffect } from 'react';
import { Line as KonvaLine, Circle, Group } from 'react-konva';
import Konva from 'konva';
import { LineShape } from '../../types/canvas.types';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';
import { 
  setActiveEdit, 
  clearActiveEdit, 
  subscribeToActiveEdit, 
  getUserCursorColor,
  ActiveEdit,
  createActiveEditData
} from '../../services/activeEdits.service';
import {
  setLivePosition,
  subscribeToShapeLivePosition,
  LivePosition
} from '../../services/livePositions.service';
import { throttle } from '../../utils/throttle';
import { EditingIndicator } from '../Collaboration/EditingIndicator';

export interface LineProps {
  line: LineShape;
  isSelected: boolean;
  onSelect: (e?: any) => void;
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;
  updateOwnCursor?: (x: number, y: number) => void;
  onMultiDragStart?: (shapeId: string, x: number, y: number) => void;
  onMultiDragUpdate?: (shapeId: string, x: number, y: number) => void;
  onMultiDragEnd?: () => void;
  multiDragPosition?: { x: number; y: number; x2?: number; y2?: number };
  onOptimisticActiveEdit?: (shapeId: string, activeEdit: any) => void;
  onOptimisticClearActiveEdit?: (shapeId: string) => void;
}

const Line: React.FC<LineProps> = ({ 
  line, 
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
  const { updateRectangle, viewport } = useCanvas();
  const { user } = useAuth();
  const groupRef = useRef<Konva.Group>(null);
  const lineRef = useRef<Konva.Line>(null);
  const startHandleRef = useRef<Konva.Circle>(null);
  const endHandleRef = useRef<Konva.Circle>(null);
  
  // State for interactive operations
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingStart, setIsResizingStart] = useState(false);
  const [isResizingEnd, setIsResizingEnd] = useState(false);
  const [resizeDimensions, setResizeDimensions] = useState<{ x?: number; y?: number; x2?: number; y2?: number } | null>(null);
  const [immediateDragPosition, setImmediateDragPosition] = useState<{ x: number; y: number; x2: number; y2: number } | null>(null);
  const [, forceUpdate] = useState({});
  
  // Collaboration state
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  
  // Throttled live position update (120 FPS for ultra-smooth indicators)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number, x2?: number, y2?: number) => {
      setLivePosition(shapeId, userId, x, y, width, height, undefined, x2, y2);
    }, 8)
  );

  // Force group position update when multiDragPosition changes (for multi-select dragging)
  // Note: For lines, we don't move the group position since the line is drawn relative to group
  // Instead, the line points will be recalculated based on currentPos which includes multiDragPosition

  // Subscribe to active edits for this line
  useEffect(() => {
    const unsubscribe = subscribeToActiveEdit(line.id, (edit) => {
      if (edit && edit.userId !== user?.userId) {
        setActiveEditState(edit);
      } else {
        setActiveEditState(null);
      }
    });
    return unsubscribe;
  }, [line.id, user?.userId]);
  
  // Subscribe to live positions ONLY when another user is actively editing this line
  useEffect(() => {
    if (!activeEdit) {
      setLivePositionState(null);
      return;
    }
    
    console.log('[Line] Subscribing to live position for line being edited by:', activeEdit.userId);
    let clearTimer: NodeJS.Timeout | null = null;
    
    const unsubscribe = subscribeToShapeLivePosition(line.id, (livePositionData) => {
      console.log('[Line] Live position update for', line.id, ':', livePositionData ? 'YES' : 'NO');
      
      if (livePositionData && livePositionData.userId !== user?.userId) {
        console.log('[Line] Using live position from another user:', livePositionData.userId);
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
  }, [line.id, user?.userId, activeEdit]);

  // Shape position (for actual shape rendering) - excludes immediate drag position
  const shapePos = livePosition && livePosition.userId !== user?.userId
    ? { x: livePosition.x, y: livePosition.y, x2: livePosition.x2 || line.x2, y2: livePosition.y2 || line.y2 }
    : multiDragPosition && !isDragging
    ? { x: multiDragPosition.x, y: multiDragPosition.y, x2: multiDragPosition.x2 ?? line.x2, y2: multiDragPosition.y2 ?? line.y2 }
    : resizeDimensions && isResizingStart
    ? { x: resizeDimensions.x ?? line.x, y: resizeDimensions.y ?? line.y, x2: line.x2, y2: line.y2 }
    : resizeDimensions && isResizingEnd
    ? { x: line.x, y: line.y, x2: resizeDimensions.x2 ?? line.x2, y2: resizeDimensions.y2 ?? line.y2 }
    : { x: line.x, y: line.y, x2: line.x2, y2: line.y2 };

  // Indicator position (for editing indicators) - includes immediate drag position for smooth movement
  const indicatorPos = immediateDragPosition && isDragging
    ? { x: immediateDragPosition.x, y: immediateDragPosition.y, x2: immediateDragPosition.x2, y2: immediateDragPosition.y2 }
    : shapePos;

  // Calculate line midpoint for cursor positioning during drag
  // const midpointX = (currentPos.x + currentPos.x2) / 2;
  // const midpointY = (currentPos.y + currentPos.y2) / 2;

  // Handle drag start
  const handleDragStart = () => {
    if (!user?.userId || !user?.email) return;
    setIsDragging(true);
    
    // Only select the shape if it's not already selected (preserves multi-selection)
    if (!isSelected) {
      onSelect();
    }
    
    // Set active edit state
    const cursorColor = getUserCursorColor(user.userId);
    const firstName = user.firstName || user.email.split('@')[0];
    
    // Optimistic update: immediately show edit indicator locally
    if (onOptimisticActiveEdit) {
      const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'moving', cursorColor);
      onOptimisticActiveEdit(line.id, activeEditData);
    }
    // Async update: sync to RTDB for other users
    setActiveEdit(line.id, user.userId, user.email, firstName, 'moving', cursorColor);
    
    // Start multi-drag if this shape is part of a multi-selection
    if (onMultiDragStart) {
      onMultiDragStart(line.id, line.x, line.y);
    }
  };

  // Handle drag move
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    const node = e.target;
    const x = node.x();
    const y = node.y();
    
    // Store immediate drag position for instant indicator updates
    setImmediateDragPosition({ x, y, x2: line.x2, y2: line.y2 });
    
    // Update cursor to ACTUAL mouse position in canvas coordinates
    if (updateOwnCursor && stage) {
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        const canvasX = (pointerPos.x - viewport.x) / viewport.scale;
        const canvasY = (pointerPos.y - viewport.y) / viewport.scale;
        updateOwnCursor(canvasX, canvasY);
      }
    }
    
    // Calculate delta from drag
    const group = groupRef.current;
    if (group && user) {
      const deltaX = group.x();
      const deltaY = group.y();
      
      // Update endpoint handle positions during drag
      if (startHandleRef.current && endHandleRef.current) {
        startHandleRef.current.x(line.x + deltaX);
        startHandleRef.current.y(line.y + deltaY);
        endHandleRef.current.x(line.x2 + deltaX);
        endHandleRef.current.y(line.y2 + deltaY);
      }
      
      // Update multi-drag if this shape is part of a multi-selection
      if (onMultiDragUpdate) {
        onMultiDragUpdate(line.id, line.x + deltaX, line.y + deltaY);
      }
      
      // Stream individual live position for leader shape during multi-drag
      // Follower shapes are handled by the multi-drag system
      if (!multiDragPosition || isDragging) {
        throttledLivePositionUpdate.current(
          line.id,
          user.userId,
          line.x + deltaX,
          line.y + deltaY,
          Math.abs(line.x2 - line.x), // width
          Math.abs(line.y2 - line.y), // height
          line.x2 + deltaX, // x2
          line.y2 + deltaY  // y2
        );
      }
    }
    
    forceUpdate({});
  };

  // Handle drag end
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    setImmediateDragPosition(null);
    const group = groupRef.current;
    if (!group) return;
    
    // Calculate new positions
    const deltaX = group.x();
    const deltaY = group.y();
    const newX = line.x + deltaX;
    const newY = line.y + deltaY;
    const newX2 = line.x2 + deltaX;
    const newY2 = line.y2 + deltaY;
    
    // Reset group position immediately for smooth visual
    group.x(0);
    group.y(0);
    
    // Update endpoint handle positions
    if (startHandleRef.current && endHandleRef.current) {
      startHandleRef.current.x(newX);
      startHandleRef.current.y(newY);
      endHandleRef.current.x(newX2);
      endHandleRef.current.y(newY2);
    }
    
    // Update Firestore
    await updateRectangle(line.id, {
      x: newX,
      y: newY,
      x2: newX2,
      y2: newY2,
      lastModifiedBy: user?.email || line.createdBy,
    });
    
    // End multi-drag if this shape was part of a multi-selection
    if (onMultiDragEnd) {
      onMultiDragEnd();
      // Don't clear active edit here - endMultiDrag will handle cleanup for all selected shapes
    } else {
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(line.id);
      }
      // Async update: clear from RTDB for other users
      clearActiveEdit(line.id);
    }
  };

  // Handle start point resize
  const handleStartResizeStart = () => {
    if (!user?.userId || !user?.email) return;
    setIsResizingStart(true);
    
    onSelect();
    
    const cursorColor = getUserCursorColor(user.userId);
    const firstName = user.firstName || user.email.split('@')[0];
    
    // Optimistic update: immediately show edit indicator locally
    if (onOptimisticActiveEdit) {
      const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'resizing', cursorColor);
      onOptimisticActiveEdit(line.id, activeEditData);
    }
    // Async update: sync to RTDB for other users
    setActiveEdit(line.id, user.userId, user.email, firstName, 'resizing', cursorColor);
  };

  const handleStartResizeMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const stage = node.getStage();
    
    if (updateOwnCursor && stage) {
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        const canvasX = (pointerPos.x - viewport.x) / viewport.scale;
        const canvasY = (pointerPos.y - viewport.y) / viewport.scale;
        updateOwnCursor(canvasX, canvasY);
      }
    }
    
    // Update start point (x, y) while keeping end point (x2, y2) fixed
    const newX = node.x();
    const newY = node.y();
    
    // Update resize dimensions for visual feedback
    setResizeDimensions({ x: newX, y: newY });
    
    // Stream live position
    if (user) {
      throttledLivePositionUpdate.current(
        line.id,
        user.userId,
        newX,
        newY,
        Math.abs(line.x2 - newX),
        Math.abs(line.y2 - newY),
        line.x2,
        line.y2
      );
    }
    
    forceUpdate({});
  };

  const handleStartResizeEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();
    
    // Update Firestore first
    await updateRectangle(line.id, {
      x: newX,
      y: newY,
      lastModifiedBy: user?.email || line.createdBy,
    });
    
    // Clear states after update
    setIsResizingStart(false);
    setResizeDimensions(null);
    
    // Optimistic update: immediately clear edit indicator locally
    if (onOptimisticClearActiveEdit) {
      onOptimisticClearActiveEdit(line.id);
    }
    // Async update: clear from RTDB for other users
    clearActiveEdit(line.id);
  };

  // Handle end point resize
  const handleEndResizeStart = () => {
    if (!user?.userId || !user?.email) return;
    setIsResizingEnd(true);
    
    onSelect();
    
    const cursorColor = getUserCursorColor(user.userId);
    const firstName = user.firstName || user.email.split('@')[0];
    
    // Optimistic update: immediately show edit indicator locally
    if (onOptimisticActiveEdit) {
      const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'resizing', cursorColor);
      onOptimisticActiveEdit(line.id, activeEditData);
    }
    // Async update: sync to RTDB for other users
    setActiveEdit(line.id, user.userId, user.email, firstName, 'resizing', cursorColor);
  };

  const handleEndResizeMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const stage = node.getStage();
    
    if (updateOwnCursor && stage) {
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        const canvasX = (pointerPos.x - viewport.x) / viewport.scale;
        const canvasY = (pointerPos.y - viewport.y) / viewport.scale;
        updateOwnCursor(canvasX, canvasY);
      }
    }
    
    // Update end point (x2, y2) while keeping start point (x, y) fixed
    const newX2 = node.x();
    const newY2 = node.y();
    
    // Update resize dimensions for visual feedback
    setResizeDimensions({ x2: newX2, y2: newY2 });
    
    // Stream live position
    if (user) {
      throttledLivePositionUpdate.current(
        line.id,
        user.userId,
        line.x,
        line.y,
        Math.abs(newX2 - line.x),
        Math.abs(newY2 - line.y),
        newX2,
        newY2
      );
    }
    
    forceUpdate({});
  };

  const handleEndResizeEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newX2 = node.x();
    const newY2 = node.y();
    
    // Update Firestore first
    await updateRectangle(line.id, {
      x2: newX2,
      y2: newY2,
      lastModifiedBy: user?.email || line.createdBy,
    });
    
    // Clear states after update
    setIsResizingEnd(false);
    setResizeDimensions(null);
    
    // Optimistic update: immediately clear edit indicator locally
    if (onOptimisticClearActiveEdit) {
      onOptimisticClearActiveEdit(line.id);
    }
    // Async update: clear from RTDB for other users
    clearActiveEdit(line.id);
  };

  // Render only indicator (for indicators layer)
  if (renderOnlyIndicator) {
    if (!showIndicator || !activeEdit || activeEdit.userId === user?.userId) {
      return null;
    }
    
    const indicatorPos = livePosition && livePosition.userId !== user?.userId
      ? { x: livePosition.x, y: livePosition.y, width: Math.abs((livePosition.x2 || line.x2) - livePosition.x), height: Math.abs((livePosition.y2 || line.y2) - livePosition.y) }
      : { x: line.x, y: line.y, width: Math.abs(line.x2 - line.x), height: Math.abs(line.y2 - line.y) };
    
    return (
      <EditingIndicator
        activeEdit={activeEdit}
        rectangleX={indicatorPos.x}
        rectangleY={indicatorPos.y}
        rectangleWidth={indicatorPos.width}
        rectangleHeight={indicatorPos.height}
        scale={viewport.scale}
      />
    );
  }

  return (
    <>
      <Group
        ref={groupRef}
        x={0}
        y={0}
        draggable={!line.locked && !isResizingStart && !isResizingEnd && (!multiDragPosition || isDragging)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(e)}
        onTap={(e) => onSelect(e)}
      >
        {/* Selection outline (thicker, behind) */}
        {isSelected && (
          <KonvaLine
            points={[shapePos.x, shapePos.y, shapePos.x2, shapePos.y2]}
            stroke="#1565C0"
            strokeWidth={Math.max(line.strokeWidth, 4) + 8}
            strokeScaleEnabled={false}
            perfectDrawEnabled={false}
            listening={false}
          />
        )}
        
        {/* Main line (on top) */}
        <KonvaLine
          ref={lineRef}
          points={[shapePos.x, shapePos.y, shapePos.x2, shapePos.y2]}
          stroke={line.color}
          strokeWidth={Math.max(line.strokeWidth, 4)}
          opacity={line.opacity}
          perfectDrawEnabled={false}
          hitStrokeWidth={12}
          listening={true}
        />
      </Group>
      
      {/* Start point handle */}
      {isSelected && (
        <Circle
          ref={startHandleRef}
          x={shapePos.x}
          y={shapePos.y}
          radius={6}
          fill="white"
          stroke="#1565C0"
          strokeWidth={2}
          draggable={!line.locked}
          listening={line.visible !== false}
          onDragStart={handleStartResizeStart}
          onDragMove={handleStartResizeMove}
          onDragEnd={handleStartResizeEnd}
          onMouseEnter={() => {
            if (lineRef.current) {
              const stage = lineRef.current.getStage();
              if (stage) {
                stage.container().style.cursor = 'crosshair';
              }
            }
          }}
          onMouseLeave={() => {
            if (lineRef.current) {
              const stage = lineRef.current.getStage();
              if (stage) {
                stage.container().style.cursor = 'default';
              }
            }
          }}
        />
      )}
      
      {/* End point handle */}
      {isSelected && (
        <Circle
          ref={endHandleRef}
          x={shapePos.x2}
          y={shapePos.y2}
          radius={6}
          fill="white"
          stroke="#1565C0"
          strokeWidth={2}
          draggable={!line.locked}
          listening={line.visible !== false}
          onDragStart={handleEndResizeStart}
          onDragMove={handleEndResizeMove}
          onDragEnd={handleEndResizeEnd}
          onMouseEnter={() => {
            if (lineRef.current) {
              const stage = lineRef.current.getStage();
              if (stage) {
                stage.container().style.cursor = 'crosshair';
              }
            }
          }}
          onMouseLeave={() => {
            if (lineRef.current) {
              const stage = lineRef.current.getStage();
              if (stage) {
                stage.container().style.cursor = 'default';
              }
            }
          }}
        />
      )}
      
      {/* Editing indicator is rendered in the indicators layer for proper z-index */}
    </>
  );
};

export default Line;
