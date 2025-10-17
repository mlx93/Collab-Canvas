import React, { useRef, useState, useEffect } from 'react';
import { Text as KonvaText, Rect as KonvaRect, Group, Circle } from 'react-konva';
import Konva from 'konva';
import { TextShape } from '../../types/canvas.types';
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

export interface TextProps {
  text: TextShape;
  isSelected: boolean;
  onSelect: (e?: any) => void;
  showIndicator?: boolean;
  renderOnlyIndicator?: boolean;
  updateOwnCursor?: (x: number, y: number) => void;
  onMultiDragStart?: (shapeId: string, x: number, y: number) => void;
  onMultiDragUpdate?: (shapeId: string, x: number, y: number) => void;
  onMultiDragEnd?: () => void;
  multiDragPosition?: { x: number; y: number };
  onEditingChange?: (editing: boolean, textData?: { x: number; y: number; width: number; height: number; text: string; fontSize: number; fontFamily: string; fontStyle: string; fontWeight: string; textColor?: string; backgroundColor?: string; editText: string; onChange: (text: string) => void; onSubmit: () => void; onCancel: () => void }) => void;
  onOptimisticActiveEdit?: (shapeId: string, activeEdit: any) => void;
  onOptimisticClearActiveEdit?: (shapeId: string) => void;
}

export const Text: React.FC<TextProps> = ({
  text,
  isSelected,
  onSelect,
  showIndicator = false,
  renderOnlyIndicator = false,
  updateOwnCursor,
  onMultiDragStart,
  onMultiDragUpdate,
  onMultiDragEnd,
  multiDragPosition,
  onEditingChange,
  onOptimisticActiveEdit,
  onOptimisticClearActiveEdit
}) => {
  const textRef = useRef<Konva.Text>(null);
  const groupRef = useRef<Konva.Group>(null);
  const handleRef = useRef<Konva.Circle>(null);
  const { updateRectangle, rectangles, viewport } = useCanvas();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text.text);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [immediateDragPosition, setImmediateDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState({});
  const [activeEdit, setActiveEditState] = useState<ActiveEdit | null>(null);
  const [livePosition, setLivePositionState] = useState<LivePosition | null>(null);
  const [resizeDimensions, setResizeDimensions] = useState<{ width: number; height: number } | null>(null);
  const initialResizeState = useRef<{ x: number; y: number; width: number; height: number; initialPointerX: number; initialPointerY: number } | null>(null);
  const newZIndexRef = useRef<number | null>(null); // Store calculated z-index for this edit session
  
  // Throttled text update for real-time syncing (100ms delay for more responsive feel)
  const throttledTextUpdate = useRef(
    throttle((textId: string, newText: string) => {
      updateRectangle(textId, { 
        text: newText, 
        lastModifiedBy: user?.email || text.createdBy 
      });
    }, 100)
  );

  // Throttled live position update for near-perfect real-time streaming (4ms = 250 FPS)
  const throttledLivePositionUpdate = useRef(
    throttle((shapeId: string, userId: string, x: number, y: number, width: number, height: number, zIndex?: number) => {
      setLivePosition(shapeId, userId, x, y, width, height, zIndex);
    }, 4)
  );

  // Force node position update when multiDragPosition changes (for multi-select dragging)
  useEffect(() => {
    if (multiDragPosition && !isDragging && groupRef.current) {
      groupRef.current.position({ x: multiDragPosition.x, y: multiDragPosition.y });
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [multiDragPosition, isDragging]);

  // Shape position (for actual shape rendering) - excludes immediate drag position
  const shapePos = livePosition && livePosition.userId !== user?.userId
    ? { 
        x: livePosition.x, 
        y: livePosition.y, 
        width: livePosition.width, 
        height: livePosition.height,
        zIndex: livePosition.zIndex !== undefined ? livePosition.zIndex : text.zIndex
      }
    : multiDragPosition && !isDragging
    ? {
        x: multiDragPosition.x,
        y: multiDragPosition.y,
        width: text.width,
        height: text.height,
        zIndex: text.zIndex
      }
    : resizeDimensions && isResizing
    ? { 
        x: text.x, 
        y: text.y, 
        width: resizeDimensions.width, 
        height: resizeDimensions.height,
        zIndex: newZIndexRef.current !== null ? newZIndexRef.current : text.zIndex
      }
    : { 
        x: text.x, 
        y: text.y, 
        width: text.width, 
        height: text.height,
        zIndex: text.zIndex
      };

  // Indicator position (for editing indicators) - includes immediate drag position for smooth movement
  const indicatorPos = immediateDragPosition && isDragging
    ? {
        x: immediateDragPosition.x,
        y: immediateDragPosition.y,
        width: text.width,
        height: text.height,
        zIndex: newZIndexRef.current !== null ? newZIndexRef.current : text.zIndex
      }
    : shapePos;

  const currentX = shapePos.x;
  const currentY = shapePos.y;
  
  // Calculate display dimensions (use shapePos which handles live position and resize)
  const displayWidth = shapePos.width;
  const displayHeight = shapePos.height;

  // Update resize handle position when selection changes or when resizing
  useEffect(() => {
    if (isSelected && handleRef.current && !renderOnlyIndicator) {
      handleRef.current.x(currentX + displayWidth);
      handleRef.current.y(currentY + displayHeight);
    }
  }, [isSelected, renderOnlyIndicator, currentX, currentY, displayWidth, displayHeight]);

  // Handle active edit subscription
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = subscribeToActiveEdit(text.id, (edit: ActiveEdit | null) => {
      if (edit && edit.userId !== user.userId) {
        setActiveEditState(edit);
        if (edit.action === 'editing') {
          setIsEditing(false);
        }
      } else {
        setActiveEditState(null);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text.id, user?.userId]);

  // Handle live position subscription
  useEffect(() => {
    if (!activeEdit) {
      setLivePositionState(null);
      return;
    }

    const unsubscribe = subscribeToShapeLivePosition(text.id, (livePosition: LivePosition | null) => {
      if (livePosition && livePosition.userId !== user?.userId) {
        setLivePositionState(livePosition);
      } else {
        setLivePositionState(null);
      }
    });

    return () => {
      unsubscribe();
      setLivePositionState(null);
    };
  }, [text.id, user?.userId, activeEdit]);

  const handleDragStart = () => {
    if (renderOnlyIndicator) return;
    setIsDragging(true);
    
    // Only select the shape if it's not already selected (preserves multi-selection)
    if (!isSelected) {
      onSelect();
    }
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    if (user?.email) {
      const cursorColor = getUserCursorColor(user.userId);
      const firstName = user.firstName || 'User';
      
      // Optimistic update: immediately show edit indicator locally
      if (onOptimisticActiveEdit) {
        const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'moving', cursorColor);
        onOptimisticActiveEdit(text.id, activeEditData);
      }
      // Async update: sync to RTDB for other users
      setActiveEdit(text.id, user.userId, user.email, firstName, 'moving', cursorColor);
    }
    
    // Start multi-drag if this shape is part of a multi-selection
    if (onMultiDragStart) {
      onMultiDragStart(text.id, text.x, text.y);
    }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (renderOnlyIndicator) return;
    
    const node = e.target;
    const stage = node.getStage();
    const newX = node.x();
    const newY = node.y();
    
    // Store immediate drag position for instant indicator updates
    setImmediateDragPosition({ x: newX, y: newY });
    
    // Update resize handle position during drag (bottom-right corner)
    if (handleRef.current) {
      handleRef.current.x(newX + displayWidth);
      handleRef.current.y(newY + displayHeight);
    }
    
    // Update multi-drag if this shape is part of a multi-selection
    if (onMultiDragUpdate) {
      onMultiDragUpdate(text.id, newX, newY);
    }
    
    // Stream individual live position for leader shape during multi-drag
    // Follower shapes are handled by the multi-drag system
    if (user && (!multiDragPosition || isDragging)) {
      throttledLivePositionUpdate.current(
        text.id,
        user.userId,
        newX,
        newY,
        displayWidth,
        displayHeight,
        newZIndexRef.current !== null ? newZIndexRef.current : undefined
      );
    }

    // Update own cursor to actual mouse position in canvas coordinates
    if (updateOwnCursor && stage) {
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        // Convert screen coordinates to canvas coordinates (account for pan/zoom)
        const canvasX = (pointerPos.x - stage.x()) / stage.scaleX();
        const canvasY = (pointerPos.y - stage.y()) / stage.scaleY();
        updateOwnCursor(canvasX, canvasY);
      }
    }
    
    // Force re-render to show live position updates
    forceUpdate({});
  };

  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (renderOnlyIndicator) return;
    setIsDragging(false);
    setImmediateDragPosition(null);
    
    const newX = e.target.x();
    const newY = e.target.y();
    
    // Update Firestore
    await updateRectangle(text.id, { x: newX, y: newY, lastModifiedBy: user?.email || text.createdBy });
    
    // Clear z-index ref
    newZIndexRef.current = null;
    
    // End multi-drag if this shape was part of a multi-selection
    if (onMultiDragEnd) {
      onMultiDragEnd();
      // Don't clear active edit here - endMultiDrag will handle cleanup for all selected shapes
    } else {
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(text.id);
      }
      // Async update: clear from RTDB for other users
      if (user?.email) {
        clearActiveEdit(text.id);
      }
    }
  };

  const handleResizeStart = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (renderOnlyIndicator) return;
    e.cancelBubble = true; // Prevent drag propagation
    setIsResizing(true);
    onSelect(); // Auto-select on resize start
    
    // Calculate new z-index (bring to front) - maxZIndex + 1
    const maxZIndex = rectangles.length > 0 ? Math.max(...rectangles.map(r => r.zIndex)) : 0;
    newZIndexRef.current = maxZIndex + 1;
    
    // Get initial pointer position for delta-based resizing
    const handle = e.target;
    const stage = handle.getStage();
    if (!stage) return;
    
    const initialPointerPos = stage.getPointerPosition();
    if (!initialPointerPos) return;
    
    // Store initial resize state for delta-based resizing
    initialResizeState.current = {
      x: currentX,
      y: currentY,
      width: displayWidth,
      height: displayHeight,
      initialPointerX: initialPointerPos.x,
      initialPointerY: initialPointerPos.y
    };
    
    if (user?.email) {
      const cursorColor = getUserCursorColor(user.userId);
      const firstName = user.firstName || 'User';
      
      // Optimistic update: immediately show edit indicator locally
      if (onOptimisticActiveEdit) {
        const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'resizing', cursorColor);
        onOptimisticActiveEdit(text.id, activeEditData);
      }
      // Async update: sync to RTDB for other users
      setActiveEdit(text.id, user.userId, user.email, firstName, 'resizing', cursorColor);
    }

    // Handle mouse move and mouse up events
    const handleMouseMove = () => {
      if (!initialResizeState.current || !stage) return;
      
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      
      // Calculate delta from initial pointer position (not from shape corner)
      const deltaX = pointerPos.x - initialResizeState.current.initialPointerX;
      const deltaY = pointerPos.y - initialResizeState.current.initialPointerY;
      
      // Calculate new dimensions based on deltas applied to initial dimensions
      const newWidth = Math.max(20, initialResizeState.current.width + deltaX);
      const newHeight = Math.max(20, initialResizeState.current.height + deltaY);
      
      // Update resize dimensions for visual feedback
      setResizeDimensions({
        width: newWidth,
        height: newHeight
      });

      // Update handle position during drag
      if (handleRef.current) {
        handleRef.current.x(initialResizeState.current.x + newWidth);
        handleRef.current.y(initialResizeState.current.y + newHeight);
      }

      // Update cursor to actual mouse position in canvas coordinates
      if (updateOwnCursor && stage) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          // Convert screen coordinates to canvas coordinates (account for pan/zoom)
          const canvasX = (pointerPos.x - stage.x()) / stage.scaleX();
          const canvasY = (pointerPos.y - stage.y()) / stage.scaleY();
          updateOwnCursor(canvasX, canvasY);
        }
      }

      // Stream live position (throttled to 16ms / 60 FPS)
      if (user) {
        throttledLivePositionUpdate.current(
          text.id,
          user.userId,
          initialResizeState.current.x,
          initialResizeState.current.y,
          newWidth,
          newHeight,
          newZIndexRef.current !== null ? newZIndexRef.current : undefined
        );
      }
      
      forceUpdate({});
    };

    const handleMouseUp = async () => {
      // Remove event listeners first
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      
      if (!initialResizeState.current) return;
      
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      
      // Calculate final dimensions using same delta logic as handleMouseMove
      const deltaX = pointerPos.x - initialResizeState.current.initialPointerX;
      const deltaY = pointerPos.y - initialResizeState.current.initialPointerY;
      
      const finalWidth = Math.max(20, initialResizeState.current.width + deltaX);
      const finalHeight = Math.max(20, initialResizeState.current.height + deltaY);
      
      // Clear resize dimensions first
      setResizeDimensions(null);
      setIsResizing(false);
      
      // Wait for Firestore update to propagate before clearing active edit
      // This ensures Browser 2 has the new text props from Firestore
      // When clearActiveEdit() removes the live position, Browser 2 falls back to the NEW props (no flicker)
      await updateRectangle(text.id, {
        width: finalWidth,
        height: finalHeight,
        lastModifiedBy: user?.email || text.createdBy,
      });
      
      // Clear remaining state
      initialResizeState.current = null;
      newZIndexRef.current = null;
      
      // Optimistic update: immediately clear edit indicator locally
      if (onOptimisticClearActiveEdit) {
        onOptimisticClearActiveEdit(text.id);
      }
      // Async update: clear from RTDB for other users
      if (user?.email) {
        clearActiveEdit(text.id);
      }
    };

    // Add event listeners to stage
    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
  };


  const handleDoubleClick = () => {
    if (renderOnlyIndicator) return;
    
    // Clear default text if present
    const initialText = text.text === 'Double-click to edit' ? '' : text.text;
    setEditText(initialText);
    setIsEditing(true);
    
    if (user?.email) {
      const cursorColor = getUserCursorColor(user.userId);
      const firstName = user.firstName || 'User';
      
      // Optimistic update: immediately show edit indicator locally
      if (onOptimisticActiveEdit) {
        const activeEditData = createActiveEditData(user.userId, user.email, firstName, 'editing', cursorColor);
        onOptimisticActiveEdit(text.id, activeEditData);
      }
      // Async update: sync to RTDB for other users
      setActiveEdit(text.id, user.userId, user.email, firstName, 'editing', cursorColor);
    }
    
    // Notify parent that editing started - this will be updated via useEffect below
    if (onEditingChange) {
      onEditingChange(true, {
        x: currentX,
        y: currentY,
        width: displayWidth,
        height: displayHeight,
        text: text.text,
        fontSize: text.fontSize,
        fontFamily: text.fontFamily,
        fontStyle: text.fontStyle,
        fontWeight: text.fontWeight,
        textColor: text.textColor,
        backgroundColor: text.backgroundColor,
        editText: initialText,
        onChange: handleTextChange,
        onSubmit: handleTextSubmit,
        onCancel: handleTextCancel
      });
    }
  };

  // Update parent when editText changes during editing
  useEffect(() => {
    if (isEditing && onEditingChange) {
      onEditingChange(true, {
        x: currentX,
        y: currentY,
        width: displayWidth,
        height: displayHeight,
        text: text.text,
        fontSize: text.fontSize,
        fontFamily: text.fontFamily,
        fontStyle: text.fontStyle,
        fontWeight: text.fontWeight,
        textColor: text.textColor,
        backgroundColor: text.backgroundColor,
        editText: editText,
        onChange: handleTextChange,
        onSubmit: handleTextSubmit,
        onCancel: handleTextCancel
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editText, isEditing]);

  // Sync editText with text.text when text changes from PropertiesPanel
  useEffect(() => {
    if (!isEditing) {
      setEditText(text.text);
    }
  }, [text.text, isEditing]);

  // Handle real-time text updates during editing
  const handleTextChange = (newText: string) => {
    setEditText(newText);
    
    // Update Firestore with throttled updates for real-time sync
    if (isEditing && user?.email) {
      throttledTextUpdate.current(text.id, newText);
    }
  };

  const handleTextSubmit = async () => {
    if (renderOnlyIndicator) return;
    setIsEditing(false);
    
    // If empty, revert to default text
    const finalText = editText.trim() === '' ? 'Double-click to edit' : editText;
    
    // Update Firestore with final text (this will override any throttled updates)
    await updateRectangle(text.id, { text: finalText, lastModifiedBy: user?.email || text.createdBy });
    
    // Optimistic update: immediately clear edit indicator locally
    if (onOptimisticClearActiveEdit) {
      onOptimisticClearActiveEdit(text.id);
    }
    // Async update: clear from RTDB for other users
    if (user?.email) {
      clearActiveEdit(text.id);
    }
    
    // Notify parent that editing stopped
    if (onEditingChange) {
      onEditingChange(false);
    }
  };

  const handleTextCancel = () => {
    if (renderOnlyIndicator) return;
    setIsEditing(false);
    setEditText(text.text);
    
    // Optimistic update: immediately clear edit indicator locally
    if (onOptimisticClearActiveEdit) {
      onOptimisticClearActiveEdit(text.id);
    }
    // Async update: clear from RTDB for other users
    if (user?.email) {
      clearActiveEdit(text.id);
    }
    
    // Notify parent that editing stopped
    if (onEditingChange) {
      onEditingChange(false);
    }
  };

  if (renderOnlyIndicator) {
    // Only show editing indicator if there's an active edit from another user
    return activeEdit && showIndicator ? (
      <EditingIndicator
        activeEdit={activeEdit}
        rectangleX={currentX}
        rectangleY={currentY}
        rectangleWidth={displayWidth}
        scale={viewport.scale}
      />
    ) : null;
  }

  return (
    <>
      {/* Only show Konva elements when NOT editing */}
      {!isEditing && (
        <Group
          ref={groupRef}
          x={currentX}
          y={currentY}
          rotation={text.rotation}
          draggable={!isEditing && (!multiDragPosition || isDragging)}
          onClick={(e) => onSelect(e)}
          onTap={(e) => onSelect(e)}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDblClick={handleDoubleClick}
          onDblTap={handleDoubleClick}
        >
          {/* Background rectangle */}
          <KonvaRect
            x={0}
            y={0}
            width={displayWidth}
            height={displayHeight}
            fill={text.backgroundColor || '#FFFFFF'}
            stroke={text.borderColor || '#000000'}
            strokeWidth={1}
            opacity={text.opacity}
          />
          
          {/* Selection border */}
          {isSelected && (
            <KonvaRect
              x={0}
              y={0}
              width={displayWidth}
              height={displayHeight}
              stroke="#1565C0"
              strokeWidth={4}
              strokeScaleEnabled={false}
              listening={false}
            />
          )}
          
          {/* Text */}
          <KonvaText
            ref={textRef}
            x={0}
            y={0}
            width={displayWidth}
            height={displayHeight}
            text={text.text}
            fontSize={text.fontSize}
            fontFamily={text.fontFamily}
            fontStyle={text.fontStyle}
            fontWeight={text.fontWeight}
            fill={text.text === 'Double-click to edit' ? '#9CA3AF' : (text.textColor || '#000000')}
            padding={4}
            wrap="word"
            align="left"
            verticalAlign="top"
            opacity={text.opacity}
          />
        </Group>
      )}
      
      {/* Resize handle (bottom-right corner) */}
      {isSelected && !isEditing && (
        <Circle
          ref={handleRef}
          x={currentX + displayWidth}
          y={currentY + displayHeight}
          radius={6}
          fill="white"
          stroke="#1565C0"
          strokeWidth={2}
          onMouseDown={handleResizeStart}
        />
      )}
      
      {/* Textarea will be rendered by Canvas.tsx outside the Konva Stage */}
    </>
  );
};

export default Text;
