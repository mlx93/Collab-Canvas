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
  ActiveEdit 
} from '../../services/activeEdits.service';
import {
  setLivePosition,
  subscribeToShapeLivePosition,
  LivePosition
} from '../../services/livePositions.service';
import { throttle } from '../../utils/throttle';

interface LineProps {
  line: LineShape;
  isSelected: boolean;
  onSelect: () => void;
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;
  updateOwnCursor?: (x: number, y: number) => void;
}

const Line: React.FC<LineProps> = ({ 
  line, 
  isSelected, 
  onSelect, 
  showIndicator = true,
  renderOnlyIndicator = false,
  updateOwnCursor
}) => {
  const { updateRectangle, viewport } = useCanvas();
  const { user } = useAuth();
  const groupRef = useRef<Konva.Group>(null);
  const lineRef = useRef<Konva.Line>(null);
  const startHandleRef = useRef<Konva.Circle>(null);
  const endHandleRef = useRef<Konva.Circle>(null);
  
  // State for interactive operations
  const [isResizingStart, setIsResizingStart] = useState(false);
  const [isResizingEnd, setIsResizingEnd] = useState(false);
  const [resizeDimensions, setResizeDimensions] = useState<{ x?: number; y?: number; x2?: number; y2?: number } | null>(null);
  const [, forceUpdate] = useState({});
  
  // Collaboration state
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  
  // Throttled live position update (60 FPS)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number, x2?: number, y2?: number) => {
      setLivePosition(shapeId, userId, x, y, width, height, undefined, x2, y2);
    }, 16)
  );

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

  // Use live position if available, or resize dimensions if actively resizing
  const currentPos = livePosition && livePosition.userId !== user?.userId
    ? { x: livePosition.x, y: livePosition.y, x2: livePosition.x2 || line.x2, y2: livePosition.y2 || line.y2 }
    : resizeDimensions && isResizingStart
    ? { x: resizeDimensions.x ?? line.x, y: resizeDimensions.y ?? line.y, x2: line.x2, y2: line.y2 }
    : resizeDimensions && isResizingEnd
    ? { x: line.x, y: line.y, x2: resizeDimensions.x2 ?? line.x2, y2: resizeDimensions.y2 ?? line.y2 }
    : { x: line.x, y: line.y, x2: line.x2, y2: line.y2 };

  // Calculate line midpoint for cursor positioning during drag
  // const midpointX = (currentPos.x + currentPos.x2) / 2;
  // const midpointY = (currentPos.y + currentPos.y2) / 2;

  // Handle drag start
  const handleDragStart = () => {
    if (!user?.userId || !user?.email) return;
    
    // SELECT THE LINE - User cannot edit unselected shapes
    onSelect();
    
    // Set active edit state
    const cursorColor = getUserCursorColor(user.userId);
    const firstName = user.firstName || user.email.split('@')[0];
    setActiveEdit(line.id, user.userId, user.email, firstName, 'moving', cursorColor);
  };

  // Handle drag move
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    
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
    
    forceUpdate({});
  };

  // Handle drag end
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
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
    
    clearActiveEdit(line.id);
  };

  // Handle start point resize
  const handleStartResizeStart = () => {
    if (!user?.userId || !user?.email) return;
    setIsResizingStart(true);
    
    onSelect();
    
    const cursorColor = getUserCursorColor(user.userId);
    const firstName = user.firstName || user.email.split('@')[0];
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
    clearActiveEdit(line.id);
  };

  // Handle end point resize
  const handleEndResizeStart = () => {
    if (!user?.userId || !user?.email) return;
    setIsResizingEnd(true);
    
    onSelect();
    
    const cursorColor = getUserCursorColor(user.userId);
    const firstName = user.firstName || user.email.split('@')[0];
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
    clearActiveEdit(line.id);
  };

  // Don't render if renderOnlyIndicator is true (for indicators layer)
  if (renderOnlyIndicator) {
    return null;
  }

  return (
    <>
      <Group
        ref={groupRef}
        x={0}
        y={0}
        draggable={!line.locked && !isResizingStart && !isResizingEnd}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={onSelect}
        onTap={onSelect}
      >
        {/* Selection outline (thicker, behind) */}
        {isSelected && (
          <KonvaLine
            points={[currentPos.x, currentPos.y, currentPos.x2, currentPos.y2]}
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
          points={[currentPos.x, currentPos.y, currentPos.x2, currentPos.y2]}
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
          x={currentPos.x}
          y={currentPos.y}
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
          x={currentPos.x2}
          y={currentPos.y2}
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
    </>
  );
};

export default Line;
