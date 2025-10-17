// Canvas component with Konva.js - pan, zoom, and off-white background
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle as KonvaCircle, Line as KonvaLine } from 'react-konva';
import Konva from 'konva';
import { useCanvas } from '../../hooks/useCanvas';
import { useCursors } from '../../hooks/useCursors';
import { useAuth } from '../../hooks/useAuth';
import { useUndo } from '../../context/UndoContext';
import { FPSCounter } from './FPSCounter';
import { Rectangle } from './Rectangle';
import Circle from './Circle';
import Triangle from './Triangle';
import Line from './Line';
import Text from './Text';
import { CursorOverlay } from '../Collaboration/CursorOverlay';
import { subscribeToLivePositions, LivePosition, setLivePosition } from '../../services/livePositions.service';
import { subscribeToLiveSelections, LiveSelections } from '../../services/liveSelections.service';
import { setActiveEdit, clearActiveEdit, subscribeToAllActiveEdits } from '../../services/activeEdits.service';
import { SelectionIndicator } from '../Collaboration/SelectionIndicator';
import { getCursorColorForUser } from '../../services/cursor.service';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BACKGROUND,
  MIN_ZOOM,
  MAX_ZOOM
} from '../../utils/constants';

export const Canvas: React.FC = () => {
  const { viewport, setViewport, panViewport, zoomViewport, rectangles, selectedIds, setSelectedRectangle, selectAll, deselectAll, toggleSelection, setStageSize: updateContextStageSize, updateShape, copyShapes, pasteShapes, duplicateShapes, updateCursorPosition, deleteSelected } = useCanvas();
  const { cursors, updateOwnCursor } = useCursors();
  const { user } = useAuth();
  const { undo, redo } = useUndo();
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [livePositions, setLivePositions] = useState<Record<string, LivePosition>>({});
  const [liveSelections, setLiveSelections] = useState<LiveSelections>({});
  const [activeEdits, setActiveEdits] = useState<Record<string, any>>({});
  const multiDragOffsetsRef = useRef<Record<string, { x: number; y: number }>>({});
  const multiDragStartPositionsRef = useRef<Record<string, { x: number; y: number; x2?: number; y2?: number }>>({});
  const [multiDragPositions, setMultiDragPositions] = useState<Record<string, { x: number; y: number; x2?: number; y2?: number }>>({});
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragSelectRect, setDragSelectRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [editingTextData, setEditingTextData] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
    fontWeight: string;
    textColor?: string;
    backgroundColor?: string;
    editText: string;
    onChange: (text: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
  } | null>(null);

  // Update stage size on mount, window resize, AND container resize (e.g., properties panel open/close)
  useEffect(() => {
    const updateSize = () => {
      if (stageRef.current) {
        const container = stageRef.current.container();
        const newSize = {
          width: container.offsetWidth,
          height: container.offsetHeight
        };
        setStageSize(newSize);
        updateContextStageSize(newSize); // Update context so LeftToolbar can access it
      }
    };

    updateSize();

    // Listen to window resize
    window.addEventListener('resize', updateSize);

    // Use ResizeObserver to detect when the canvas container size changes
    // This handles properties panel opening/closing
    const container = stageRef.current?.container();
    let resizeObserver: ResizeObserver | null = null;
    
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('resize', updateSize);
      if (resizeObserver && container) {
        resizeObserver.unobserve(container);
        resizeObserver.disconnect();
      }
    };
  }, [updateContextStageSize]);
  
  // Subscribe to live positions for instant z-index updates
  useEffect(() => {
    const unsubscribe = subscribeToLivePositions((positions) => {
      setLivePositions(positions);
    });
    
    return unsubscribe;
  }, []);

  // Subscribe to live selections for drag-select visibility
  useEffect(() => {
    const unsubscribe = subscribeToLiveSelections((selections) => {
      setLiveSelections(selections);
    });
    
    return unsubscribe;
  }, []);

  // Subscribe to active edits to know which shapes are being edited
  useEffect(() => {
    const unsubscribe = subscribeToAllActiveEdits((edits: Record<string, any>) => {
      setActiveEdits(edits);
    });
    
    return unsubscribe;
  }, []);

  // Optimistic active edit functions for immediate local updates
  const optimisticallySetActiveEdit = useCallback((shapeId: string, activeEdit: any) => {
    setActiveEdits(prev => ({
      ...prev,
      [shapeId]: activeEdit
    }));
  }, []);

  const optimisticallyClearActiveEdit = useCallback((shapeId: string) => {
    setActiveEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[shapeId];
      return newEdits;
    });
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = viewport.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate zoom delta
    const delta = e.evt.deltaY > 0 ? -0.05 : 0.05;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale + delta));

    if (newScale === oldScale) return;

    // Calculate new position to zoom towards pointer
    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    };

    setViewport({
      x: newPos.x,
      y: newPos.y,
      scale: newScale
    });
  };

  // Handle keyboard zoom (Shift + Plus/Minus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          zoomViewport(0.1);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomViewport(-0.1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomViewport]);

  // Handle multi-selection keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track modifier keys
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }

      // Handle selection shortcuts
      if (e.ctrlKey || e.metaKey) { // Ctrl on Windows/Linux, Cmd on Mac
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'c':
            e.preventDefault();
            copyShapes();
            break;
          case 'v':
            e.preventDefault();
            pasteShapes();
            break;
          case 'd':
            e.preventDefault();
            duplicateShapes();
            break;
          case 'u':
            e.preventDefault();
            undo();
            break;
          case 'r':
            e.preventDefault();
            redo();
            break;
          case 'escape':
            e.preventDefault();
            deselectAll();
            break;
        }
      }
      
      // Handle Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }

      // Handle Escape key (without modifiers)
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectAll, deselectAll, copyShapes, pasteShapes, duplicateShapes, deleteSelected, undo, redo]);

  // Move selected shapes with arrow keys
  const moveSelectedShapes = useCallback((dx: number, dy: number) => {
    if (selectedIds.length === 0) return;
    
    // Update all selected shapes
    selectedIds.forEach(id => {
      const shape = rectangles.find(r => r.id === id);
      if (shape) {
        updateShape(id, {
          x: shape.x + dx,
          y: shape.y + dy
        });
      }
    });
  }, [selectedIds, rectangles, updateShape]);

  // Arrow key handler (separate useEffect to avoid dependency issues)
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle Arrow keys for moving selected shapes or panning canvas
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const distance = e.shiftKey ? 1 : 10; // Shift = 1px, normal = 10px
        const dx = e.key === 'ArrowLeft' ? -distance : e.key === 'ArrowRight' ? distance : 0;
        const dy = e.key === 'ArrowUp' ? -distance : e.key === 'ArrowDown' ? distance : 0;
        
        if (dx !== 0 || dy !== 0) {
          if (selectedIds.length > 0) {
            // Move selected shapes
            moveSelectedShapes(dx, dy);
          } else {
            // Pan canvas when no shapes are selected (opposite direction for intuitive navigation)
            panViewport(-dx, -dy);
          }
        }
      }
    };

    window.addEventListener('keydown', handleArrowKeys);
    return () => window.removeEventListener('keydown', handleArrowKeys);
  }, [moveSelectedShapes, selectedIds, panViewport]);

  // Multi-shape movement functions
  const startMultiDrag = useCallback((draggedShapeId: string, startX: number, startY: number) => {
    if (selectedIds.length <= 1) return;

    const draggedShape = rectangles.find(r => r.id === draggedShapeId);
    if (!draggedShape) return;

    console.log(`[Multi-drag] Starting multi-drag for ${selectedIds.length} shapes, leader: ${draggedShapeId}`);

    // Calculate offsets from dragged shape to all other selected shapes
    const offsets: Record<string, { x: number; y: number }> = {};
    const startPositions: Record<string, { x: number; y: number; x2?: number; y2?: number }> = {};
    
    selectedIds.forEach(id => {
      const shape = rectangles.find(r => r.id === id);
      if (shape) {
        // Store start position for ALL selected shapes (including dragged one)
        if (shape.type === 'line') {
          startPositions[id] = { x: shape.x, y: shape.y, x2: (shape as any).x2, y2: (shape as any).y2 };
        } else {
          startPositions[id] = { x: shape.x, y: shape.y };
        }
        
        // Store offsets for non-dragged shapes
        if (id !== draggedShapeId) {
          offsets[id] = {
            x: shape.x - draggedShape.x,
            y: shape.y - draggedShape.y
          };
          console.log(`[Multi-drag] Follower ${id} offset: (${offsets[id].x}, ${offsets[id].y})`);
        }
      }
    });
    
    multiDragOffsetsRef.current = offsets;
    multiDragStartPositionsRef.current = startPositions;
    
    // Set active edit for ALL selected shapes so other users subscribe to their live positions
    if (user?.userId && user?.email) {
      const cursorColorData = getCursorColorForUser(user.email);
      const firstName = user.firstName || user.email.split('@')[0];
      
      selectedIds.forEach(id => {
        setActiveEdit(id, user.userId, user.email, firstName, 'moving', cursorColorData.cursorColor);
      });
    }
  }, [selectedIds, rectangles, user]);

  const updateMultiDrag = useCallback((draggedShapeId: string, newX: number, newY: number) => {
    const offsets = multiDragOffsetsRef.current;
    const startPositions = multiDragStartPositionsRef.current;
    
    if (selectedIds.length <= 1 || Object.keys(offsets).length === 0) return;

    // Calculate delta from start position
    const draggedStartPos = startPositions[draggedShapeId];
    if (!draggedStartPos) return;
    
    const deltaX = newX - draggedStartPos.x;
    const deltaY = newY - draggedStartPos.y;
    
    console.log(`[Multi-drag] Update: leader ${draggedShapeId} at (${newX}, ${newY}), delta: (${deltaX}, ${deltaY})`);

    // Update local multi-drag positions for all selected shapes
    const newPositions: Record<string, { x: number; y: number; x2?: number; y2?: number }> = {};
    selectedIds.forEach(id => {
      if (startPositions[id]) {
        const startPos = startPositions[id];
        const shape = rectangles.find(r => r.id === id);
        
        // Handle Lines specially (they have x2, y2)
        if (shape?.type === 'line' && startPos.x2 !== undefined && startPos.y2 !== undefined) {
          newPositions[id] = {
            x: startPos.x + deltaX,
            y: startPos.y + deltaY,
            x2: startPos.x2 + deltaX,
            y2: startPos.y2 + deltaY
          };
        } else {
          newPositions[id] = {
            x: startPos.x + deltaX,
            y: startPos.y + deltaY
          };
        }
        console.log(`[Multi-drag] Calculated position for ${id}: (${newPositions[id].x}, ${newPositions[id].y})`);
      } else {
        console.log(`[Multi-drag] No start position found for ${id}`);
      }
    });
    console.log(`[Multi-drag] Setting multiDragPositions:`, newPositions);
    setMultiDragPositions(newPositions);

    // Broadcast live positions for FOLLOWER shapes only during multi-drag
    // The leader shape broadcasts its own live position through its individual handleDragMove
    selectedIds.forEach(id => {
      // Skip the leader shape - it broadcasts its own live position
      if (id === draggedShapeId) return;
      
      const shape = rectangles.find(r => r.id === id);
      if (shape) {
        let broadcastX: number;
        let broadcastY: number;
        let width = 0;
        let height = 0;
        let x2: number | undefined;
        let y2: number | undefined;
        
        // Get shape dimensions and calculate position based on type
        if (shape.type === 'rectangle' || shape.type === 'triangle' || shape.type === 'text') {
          width = (shape as any).width;
          height = (shape as any).height;
        } else if (shape.type === 'circle') {
          const radius = (shape as any).radius;
          width = radius;
          height = radius;
        } else if (shape.type === 'line') {
          width = 0;
          height = 0;
        }
        
        // Follower shapes use calculated position from multi-drag
        const newPos = newPositions[id];
        if (newPos) {
          broadcastX = newPos.x;
          broadcastY = newPos.y;
          if (shape.type === 'line' && newPos.x2 !== undefined && newPos.y2 !== undefined) {
            x2 = newPos.x2;
            y2 = newPos.y2;
          }
          
          // Broadcast live position for this follower shape
          console.log(`[Multi-drag] Broadcasting follower shape ${id} to position (${broadcastX}, ${broadcastY})`);
          setLivePosition(id, user?.userId || '', broadcastX, broadcastY, width, height, undefined, x2, y2);
        } else {
          console.log(`[Multi-drag] No position calculated for follower shape ${id}`);
        }
      }
    });
  }, [selectedIds, rectangles, user]);

  const endMultiDrag = useCallback(async () => {
    // Batch update Firestore for all moved shapes
    if (selectedIds.length > 1 && user && Object.keys(multiDragPositions).length > 0) {
      const updates = selectedIds.map(id => {
        const newPos = multiDragPositions[id];
        if (newPos) {
          const shape = rectangles.find(r => r.id === id);
          // Handle lines with x2, y2
          if (shape?.type === 'line' && newPos.x2 !== undefined && newPos.y2 !== undefined) {
            return updateShape(id, {
              x: newPos.x,
              y: newPos.y,
              x2: newPos.x2,
              y2: newPos.y2,
              lastModifiedBy: user.email || (shape?.createdBy || user.email)
            });
          } else {
            return updateShape(id, {
              x: newPos.x,
              y: newPos.y,
              lastModifiedBy: user.email || (shape?.createdBy || user.email)
            });
          }
        }
        return Promise.resolve();
      });
      
      // Wait for all updates to complete
      await Promise.all(updates);
    }
    
    // Clear active edits for all selected shapes
    selectedIds.forEach(id => {
      clearActiveEdit(id);
    });
    
    // Clear multi-drag state
    multiDragOffsetsRef.current = {};
    multiDragStartPositionsRef.current = {};
    setMultiDragPositions({});
  }, [selectedIds, multiDragPositions, rectangles, user, updateShape]);

  // Handle pan (drag empty space) - manual implementation
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Check if clicked on background (deselect all)
    const clickedOnEmpty = e.target === e.target.getStage() || (e.target.getClassName() === 'Rect' && e.target.listening() === false);
    if (clickedOnEmpty) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      if (isShiftPressed) {
        // Start drag-select - convert screen coordinates to canvas coordinates
        const canvasX = (pos.x - viewport.x) / viewport.scale;
        const canvasY = (pos.y - viewport.y) / viewport.scale;
        setIsDragSelecting(true);
        setDragSelectRect({ x: canvasX, y: canvasY, width: 0, height: 0 });
      } else {
        // Normal pan behavior
        deselectAll();
        setIsDragging(true);
        lastPosRef.current = { x: pos.x, y: pos.y };
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Update cursor position for paste operations
    const canvasX = (pos.x - viewport.x) / viewport.scale;
    const canvasY = (pos.y - viewport.y) / viewport.scale;
    updateCursorPosition(canvasX, canvasY);

    // Handle drag-select
    if (isDragSelecting && dragSelectRect) {
      // Use the already calculated canvas coordinates
      const width = canvasX - dragSelectRect.x;
      const height = canvasY - dragSelectRect.y;
      const newRect = { ...dragSelectRect, width, height };
      setDragSelectRect(newRect);
      
      // Note: Drag-select rectangle is handled by the selection broadcasting system
      // No need to broadcast here as it's handled by the selection state changes
    }
    // Handle panning if dragging
    else if (isDragging && lastPosRef.current) {
      // Calculate the delta movement in screen space
      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;

      // Use panViewport to update based on delta (handles state correctly)
      panViewport(dx, dy);

      // Update last position for next delta calculation
      lastPosRef.current = { x: pos.x, y: pos.y };
      
      // DON'T update cursor position while panning - cursor is stationary on the canvas
      // during panning, only the viewport moves
      return;
    }

    // Update cursor position for multiplayer ONLY when not panning
    // (reuse the already calculated canvas coordinates)
    // console.log('[Canvas] Updating cursor position:', canvasX, canvasY);
    updateOwnCursor(canvasX, canvasY);
  };

  const handleMouseUp = () => {
    if (isDragSelecting && dragSelectRect) {
      // Select all shapes within the drag-select rectangle
      const shapesInRect = rectangles.filter(shape => {
        // Get shape dimensions based on type
        let shapeWidth = 0;
        let shapeHeight = 0;
        
        if (shape.type === 'rectangle' || shape.type === 'triangle' || shape.type === 'text') {
          shapeWidth = (shape as any).width;
          shapeHeight = (shape as any).height;
        } else if (shape.type === 'circle') {
          const radius = (shape as any).radius;
          shapeWidth = radius * 2;
          shapeHeight = radius * 2;
        } else if (shape.type === 'line') {
          // For lines, use a small bounding box around the line
          shapeWidth = 10; // Small width for line selection
          shapeHeight = 10;
        }

        // Check if shape intersects with drag-select rectangle (both in canvas coordinates)
        const rectLeft = Math.min(dragSelectRect.x, dragSelectRect.x + dragSelectRect.width);
        const rectRight = Math.max(dragSelectRect.x, dragSelectRect.x + dragSelectRect.width);
        const rectTop = Math.min(dragSelectRect.y, dragSelectRect.y + dragSelectRect.height);
        const rectBottom = Math.max(dragSelectRect.y, dragSelectRect.y + dragSelectRect.height);

        return !(shape.x + shapeWidth < rectLeft || 
                shape.x > rectRight || 
                shape.y + shapeHeight < rectTop || 
                shape.y > rectBottom);
      });

      // Select all shapes in the rectangle
      if (shapesInRect.length > 0) {
        const shapeIds = shapesInRect.map(shape => shape.id);
        // Use setSelectedRectangle to set the first shape, then add others
        setSelectedRectangle(shapeIds[0]);
        shapeIds.slice(1).forEach(id => toggleSelection(id));
      }

      // Clear drag-select state
      setIsDragSelecting(false);
      setDragSelectRect(null);
      
      // Note: Multi-selection is handled by the selection broadcasting system
      // The selectedIds state change will trigger the broadcast automatically
    } else {
      setIsDragging(false);
      lastPosRef.current = null;
    }
  };

  // Handle touch pinch zoom
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let lastDist = 0;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (touch1 && touch2) {
        // Calculate distance between two touches
        const dist = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        if (lastDist === 0) {
          lastDist = dist;
          return;
        }

        const scale = viewport.scale * (dist / lastDist);
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));

        setViewport({
          ...viewport,
          scale: newScale
        });

        lastDist = dist;
      }
    };

    const handleTouchEnd = () => {
      lastDist = 0;
    };

    const container = stage.container();
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewport, setViewport]);

  return (
    <div className="absolute inset-0" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* FPS Counter (dev mode) */}
      <FPSCounter show={process.env.NODE_ENV === 'development'} />

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ flex: 1 }}
      >
        {/* Main Layer - Canvas background and shapes */}
        <Layer>
          {/* Canvas Background - 5000x5000px off-white */}
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill={CANVAS_BACKGROUND}
            listening={false}
          />

          {/* Shapes - sorted by z-index (lower z-index = further back) */}
          {rectangles
            .sort((a, b) => {
              // Use live z-index if available (instant layer updates), otherwise use stored z-index
              const aZIndex = livePositions[a.id]?.zIndex ?? a.zIndex;
              const bZIndex = livePositions[b.id]?.zIndex ?? b.zIndex;
              return aZIndex - bZIndex; // Lower z-index renders first (back layer)
            })
            .map((shape) => {
              // Render based on shape type
              if (shape.type === 'rectangle') {
                return (
                  <Rectangle
                    key={shape.id}
                    rectangle={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={(e) => {
                      // Check if shift is actually pressed at the time of click
                      const shiftPressed = e?.evt?.shiftKey || false;
                      if (shiftPressed) {
                        toggleSelection(shape.id);
                      } else {
                        setSelectedRectangle(shape.id);
                      }
                    }}
                    showIndicator={false}
                    updateOwnCursor={updateOwnCursor}
                    onMultiDragStart={startMultiDrag}
                    onMultiDragUpdate={updateMultiDrag}
                    onMultiDragEnd={endMultiDrag}
                    multiDragPosition={multiDragPositions[shape.id]}
                    onOptimisticActiveEdit={optimisticallySetActiveEdit}
                    onOptimisticClearActiveEdit={optimisticallyClearActiveEdit}
                  />
                );
              }
              if (shape.type === 'circle') {
                return (
                  <Circle
                    key={shape.id}
                    circle={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={(e) => {
                      // Check if shift is actually pressed at the time of click
                      const shiftPressed = e?.evt?.shiftKey || false;
                      if (shiftPressed) {
                        toggleSelection(shape.id);
                      } else {
                        setSelectedRectangle(shape.id);
                      }
                    }}
                    showIndicator={false}
                    updateOwnCursor={updateOwnCursor}
                    {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id], onOptimisticActiveEdit: optimisticallySetActiveEdit, onOptimisticClearActiveEdit: optimisticallyClearActiveEdit } as any)}
                  />
                );
              }
              if (shape.type === 'triangle') {
                return (
                  <Triangle
                    key={shape.id}
                    triangle={shape}
                    isSelected={selectedIds.includes(shape.id)}
                    onSelect={(e) => {
                      // Check if shift is actually pressed at the time of click
                      const shiftPressed = e?.evt?.shiftKey || false;
                      if (shiftPressed) {
                        toggleSelection(shape.id);
                      } else {
                        setSelectedRectangle(shape.id);
                      }
                    }}
                    showIndicator={false}
                    updateOwnCursor={updateOwnCursor}
                    {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id], onOptimisticActiveEdit: optimisticallySetActiveEdit, onOptimisticClearActiveEdit: optimisticallyClearActiveEdit } as any)}
                  />
                );
              }
        if (shape.type === 'line') {
          return (
            <Line
              key={shape.id}
              line={shape}
              isSelected={selectedIds.includes(shape.id)}
              onSelect={() => {
                if (isShiftPressed) {
                  toggleSelection(shape.id);
                } else {
                  setSelectedRectangle(shape.id);
                }
              }}
              showIndicator={false}
              updateOwnCursor={updateOwnCursor}
              {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id], onOptimisticActiveEdit: optimisticallySetActiveEdit, onOptimisticClearActiveEdit: optimisticallyClearActiveEdit } as any)}
            />
          );
        }

        if (shape.type === 'text') {
          return (
            <Text
              key={shape.id}
              text={shape}
              isSelected={selectedIds.includes(shape.id)}
              onSelect={() => {
                if (isShiftPressed) {
                  toggleSelection(shape.id);
                } else {
                  setSelectedRectangle(shape.id);
                }
              }}
              showIndicator={false}
              updateOwnCursor={updateOwnCursor}
              {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id], onOptimisticActiveEdit: optimisticallySetActiveEdit, onOptimisticClearActiveEdit: optimisticallyClearActiveEdit } as any)}
              onEditingChange={(editing: boolean, data: any) => {
                if (editing && data) {
                  setEditingTextData(data);
                } else {
                  setEditingTextData(null);
                }
              }}
            />
          );
        }
              // TODO: Add Text rendering here
              return null;
            })}
        </Layer>

        {/* Indicators Layer - Always on top of all shapes */}
        <Layer listening={false} zIndex={10000}>
          {rectangles.map((shape) => {
            // Render indicator based on shape type
            if (shape.type === 'rectangle') {
              return (
                <Rectangle
                  key={`indicator-${shape.id}`}
                  rectangle={shape}
                  isSelected={false}
                  onSelect={() => {}}
                  showIndicator={true}
                  renderOnlyIndicator={true}
                />
              );
            }
            if (shape.type === 'circle') {
              return (
                <Circle
                  key={`indicator-${shape.id}`}
                  circle={shape}
                  isSelected={false}
                  onSelect={() => {}}
                  showIndicator={true}
                  renderOnlyIndicator={true}
                />
              );
            }
            if (shape.type === 'triangle') {
              return (
                <Triangle
                  key={`indicator-${shape.id}`}
                  triangle={shape}
                  isSelected={false}
                  onSelect={() => {}}
                  showIndicator={true}
                  renderOnlyIndicator={true}
                />
              );
            }
        if (shape.type === 'line') {
          return (
            <Line
              key={`indicator-${shape.id}`}
              line={shape}
              isSelected={false}
              onSelect={() => {}}
              showIndicator={true}
              renderOnlyIndicator={true}
            />
          );
        }

        if (shape.type === 'text') {
          return (
            <Text
              key={`indicator-${shape.id}`}
              text={shape}
              isSelected={false}
              onSelect={() => {}}
              showIndicator={true}
              renderOnlyIndicator={true}
            />
          );
        }
            // TODO: Add Text indicator rendering here
            return null;
          })}
        </Layer>

        {/* Other Users' Selection Indicators */}
        <Layer listening={false} zIndex={9999}>
          {Object.entries(liveSelections).map(([userId, selection]) => {
            console.log('Processing liveSelections:', { userId, selection, currentUserId: user?.userId });
            // Don't show our own selections
            if (userId === user?.userId) return null;
            
            return selection.selectedIds.map((shapeId: string) => {
              const shape = rectangles.find(s => s.id === shapeId);
              if (!shape) return null;
              
              // Check if this shape is being actively edited and get live position
              const livePosition = livePositions[shapeId];
              const isBeingEdited = activeEdits[shapeId];
              
              // Show selection indicator even when editing - the editing indicator will show the action text
              // but we still want to show the selection border
              
              // Use live position if available, otherwise use shape position
              const currentX = livePosition ? livePosition.x : shape.x;
              const currentY = livePosition ? livePosition.y : shape.y;
              
              // Validate coordinates - if they're invalid, skip rendering
              if (currentX === undefined || currentY === undefined || currentX < 0 || currentY < 0) {
                console.warn('Invalid coordinates for selection border:', { currentX, currentY, shape, livePosition });
                return null;
              }
              
              // Render selection indicator based on shape type
              if (shape.type === 'rectangle') {
                const currentWidth = livePosition ? livePosition.width : (shape as any).width;
                const currentHeight = livePosition ? livePosition.height : (shape as any).height;
                return (
                  <Rect
                    key={`selection-${userId}-${shapeId}`}
                    x={currentX}
                    y={currentY}
                    width={currentWidth}
                    height={currentHeight}
                    stroke={selection.cursorColor}
                    strokeWidth={3}
                    listening={false}
                  />
                );
              }
              if (shape.type === 'circle') {
                // For circles, prioritize shape radius over live position radius when not actively editing
                // This prevents stale radius values from live position after editing is complete
                const currentRadius = isBeingEdited && livePosition ? livePosition.width : (shape as any).radius;
                console.log('Circle selection border:', { 
                  shapeId, 
                  currentX, 
                  currentY, 
                  currentRadius, 
                  cursorColor: selection.cursorColor,
                  shape: shape,
                  livePosition: livePosition
                });
                // Ensure radius is valid - use fallback if invalid
                if (!currentRadius || currentRadius <= 0) {
                  console.warn('Invalid radius for circle selection border, using fallback:', { currentRadius, shape, livePosition });
                  // Use a default radius of 20 if invalid
                  const fallbackRadius = 20;
                  return (
                    <KonvaCircle
                      key={`selection-${userId}-${shapeId}`}
                      x={currentX}
                      y={currentY}
                      radius={fallbackRadius}
                      stroke={selection.cursorColor}
                      strokeWidth={3}
                      listening={false}
                    />
                  );
                }
                return (
                  <KonvaCircle
                    key={`selection-${userId}-${shapeId}`}
                    x={currentX}
                    y={currentY}
                    radius={currentRadius}
                    stroke={selection.cursorColor}
                    strokeWidth={3}
                    listening={false}
                  />
                );
              }
              if (shape.type === 'triangle') {
                const currentWidth = livePosition ? livePosition.width : (shape as any).width;
                const currentHeight = livePosition ? livePosition.height : (shape as any).height;
                // Triangle points (points up) - same as Triangle.tsx
                const points = [
                  currentX + currentWidth / 2, currentY,  // Top center
                  currentX + currentWidth, currentY + currentHeight,  // Bottom right
                  currentX, currentY + currentHeight  // Bottom left
                ];
                return (
                  <KonvaLine
                    key={`selection-${userId}-${shapeId}`}
                    points={[...points, points[0], points[1]]} // Close the triangle
                    stroke={selection.cursorColor}
                    strokeWidth={3}
                    listening={false}
                  />
                );
              }
              if (shape.type === 'line') {
                const currentX2 = livePosition ? (livePosition as any).x2 : (shape as any).x2;
                const currentY2 = livePosition ? (livePosition as any).y2 : (shape as any).y2;
                return (
                  <KonvaLine
                    key={`selection-${userId}-${shapeId}`}
                    points={[currentX, currentY, currentX2 || 0, currentY2 || 0]}
                    stroke={selection.cursorColor}
                    strokeWidth={3}
                    listening={false}
                  />
                );
              }
              if (shape.type === 'text') {
                const currentWidth = livePosition ? livePosition.width : (shape as any).width;
                const currentHeight = livePosition ? livePosition.height : (shape as any).height;
                return (
                  <Rect
                    key={`selection-${userId}-${shapeId}`}
                    x={currentX}
                    y={currentY}
                    width={currentWidth}
                    height={currentHeight}
                    stroke={selection.cursorColor}
                    strokeWidth={3}
                    listening={false}
                  />
                );
              }
              return null;
            });
          }).flat()}
          
          {/* Selection Labels - Show who selected what */}
          {Object.entries(liveSelections).map(([userId, selection]) => {
            // Don't show our own selections
            if (userId === user?.userId) return null;
            
            return selection.selectedIds.map((shapeId: string) => {
              const shape = rectangles.find(s => s.id === shapeId);
              if (!shape) return null;
              
              // Check if this shape is being actively edited and get live position
              const livePosition = livePositions[shapeId];
              const isBeingEdited = activeEdits[shapeId];
              
              console.log('Selection label check:', { 
                shapeId, 
                isBeingEdited, 
                activeEdits: activeEdits,
                livePosition: livePosition
              });
              
              // Don't show selection label if shape is being actively edited (editing indicator takes priority)
              if (isBeingEdited) return null;
              
              // Use live position if available, otherwise use shape position
              const currentX = livePosition ? livePosition.x : shape.x;
              let currentY = livePosition ? livePosition.y : shape.y;
              
              // For circles, position indicator above the circle (center Y - radius) to match EditingIndicator
              if (shape.type === 'circle') {
                const radius = livePosition ? livePosition.width / 2 : shape.radius;
                currentY = currentY - radius;
              }
              
              // Validate coordinates - if they're invalid, skip rendering
              if (currentX === undefined || currentY === undefined || currentX < 0 || currentY < 0) {
                console.warn('Invalid coordinates for selection indicator:', { currentX, currentY, shape, livePosition });
                return null;
              }
              
              // Use the new SelectionIndicator component
              const getShapeWidth = (shape: any, livePos?: any) => {
                switch (shape.type) {
                  case 'circle':
                    // For circles, prioritize shape radius over live position radius when not actively editing
                    // This prevents stale radius values from live position after editing is complete
                    const radius = isBeingEdited && livePos ? livePos.width : shape.radius;
                    // Ensure radius is valid, fallback to 20 if invalid
                    if (!radius || radius <= 0) {
                      console.warn('Invalid radius for circle selection indicator:', { radius, shape, livePos });
                      return 40; // Default diameter of 40px
                    }
                    return radius * 2;
                  case 'line':
                    const x2 = livePos ? livePos.x2 : shape.x2;
                    return Math.abs((x2 || 0) - currentX);
                  default:
                    return livePos ? livePos.width : shape.width || 0;
                }
              };
              
              const shapeWidth = getShapeWidth(shape, livePosition);
              console.log('SelectionIndicator coordinates:', { 
                shapeId, 
                currentX, 
                currentY, 
                shapeWidth, 
                scale: viewport.scale,
                shape: shape,
                livePosition: livePosition
              });
              
              return (
                <SelectionIndicator
                  key={`selection-label-${userId}-${shapeId}`}
                  selection={selection}
                  shapeX={currentX}
                  shapeY={currentY}
                  shapeWidth={shapeWidth}
                  scale={viewport.scale}
                />
              );
            });
          }).flat()}
        </Layer>

        {/* Drag-Select Rectangle */}
        {isDragSelecting && dragSelectRect && (
          <Layer listening={false}>
            <Rect
              x={dragSelectRect.x}
              y={dragSelectRect.y}
              width={dragSelectRect.width}
              height={dragSelectRect.height}
              fill="rgba(21, 101, 192, 0.1)"
              stroke="#1565C0"
              strokeWidth={1}
              dash={[5, 5]}
            />
          </Layer>
        )}

      </Stage>

      {/* Cursor Overlay - Multiplayer cursors */}
      <CursorOverlay
        cursors={cursors}
        viewportX={viewport.x}
        viewportY={viewport.y}
        scale={viewport.scale}
      />

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1.5 rounded-md text-sm font-mono">
        {Math.round(viewport.scale * 100)}%
      </div>

      {/* Text editing textarea - rendered outside Konva Stage */}
      {editingTextData && (
        <div
          style={{
            position: 'absolute',
            left: editingTextData.x * viewport.scale + viewport.x,
            top: editingTextData.y * viewport.scale + viewport.y,
            width: editingTextData.width * viewport.scale,
            height: editingTextData.height * viewport.scale,
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <textarea
            autoFocus
            ref={(el) => {
              if (el) {
                setTimeout(() => {
                  el.focus();
                  // Place cursor at end of text
                  el.selectionStart = el.value.length;
                  el.selectionEnd = el.value.length;
                }, 0);
              }
            }}
            value={editingTextData.editText}
            onChange={(e) => editingTextData.onChange(e.target.value)}
            onBlur={() => {
              // End editing mode but keep text selected
              if (editingTextData) {
                editingTextData.onSubmit();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                editingTextData.onSubmit();
              } else if (e.key === 'Escape') {
                editingTextData.onCancel();
              }
            }}
            placeholder="Type your text here..."
            style={{
              width: '100%',
              height: '100%',
              border: '2px solid #3b82f6',
              borderRadius: '4px',
              padding: '4px',
              fontSize: `${editingTextData.fontSize}px`,
              fontFamily: editingTextData.fontFamily,
              fontStyle: editingTextData.fontStyle,
              fontWeight: editingTextData.fontWeight,
              color: editingTextData.textColor || '#000000',
              backgroundColor: editingTextData.backgroundColor || '#FFFFFF',
              resize: 'none',
              outline: 'none',
              lineHeight: 'normal', // Use browser default line height to match Konva
              whiteSpace: 'pre-wrap', // Preserve line breaks and wrap text
              wordWrap: 'break-word', // Break long words
              overflow: 'hidden', // Hide overflow to match Konva text bounds
              boxSizing: 'border-box', // Include padding in width/height calculation
            }}
          />
        </div>
      )}
    </div>
  );
};
