// Canvas component with Konva.js - pan, zoom, and off-white background
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import { useCanvas } from '../../hooks/useCanvas';
import { useCursors } from '../../hooks/useCursors';
import { useAuth } from '../../hooks/useAuth';
import { FPSCounter } from './FPSCounter';
import { Rectangle } from './Rectangle';
import Circle from './Circle';
import Triangle from './Triangle';
import Line from './Line';
import Text from './Text';
import { CursorOverlay } from '../Collaboration/CursorOverlay';
import { subscribeToLivePositions, LivePosition, setLivePosition } from '../../services/livePositions.service';
import { subscribeToLiveSelections, setLiveSelection, LiveSelections } from '../../services/liveSelections.service';
import { setActiveEdit, clearActiveEdit } from '../../services/activeEdits.service';
import { getCursorColorForUser } from '../../services/cursor.service';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BACKGROUND,
  MIN_ZOOM,
  MAX_ZOOM
} from '../../utils/constants';

export const Canvas: React.FC = () => {
  const { viewport, setViewport, panViewport, zoomViewport, rectangles, selectedIds, setSelectedRectangle, selectAll, deselectAll, toggleSelection, setStageSize: updateContextStageSize, updateRectangle } = useCanvas();
  const { cursors, updateOwnCursor } = useCursors();
  const { user } = useAuth();
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [livePositions, setLivePositions] = useState<Record<string, LivePosition>>({});
  const [liveSelections, setLiveSelections] = useState<LiveSelections>({});
  const multiDragOffsetsRef = useRef<Record<string, { x: number; y: number }>>({});
  const multiDragStartPositionsRef = useRef<Record<string, { x: number; y: number; x2?: number; y2?: number }>>({});
  const [multiDragPositions, setMultiDragPositions] = useState<Record<string, { x: number; y: number; x2?: number; y2?: number }>>({});
  const frameCountRef = useRef<number>(0); // For throttling multi-select broadcasts
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

  // Broadcast current selection to other users
  const broadcastSelection = useCallback(() => {
    if (user && selectedIds.length > 0) {
      setLiveSelection(
        user.userId,
        user.email,
        user.firstName,
        'multi-select',
        0, 0, 0, 0, // No rectangle for multi-select
        selectedIds
      );
    }
  }, [user, selectedIds]);

  // Subscribe to live selections for drag-select visibility
  useEffect(() => {
    const unsubscribe = subscribeToLiveSelections((selections) => {
      setLiveSelections(selections);
    });
    
    return unsubscribe;
  }, []);

  // Broadcast selection changes to other users
  useEffect(() => {
    if (selectedIds.length > 0) {
      broadcastSelection();
    }
  }, [selectedIds, user, broadcastSelection]);

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
          case 'escape':
            e.preventDefault();
            deselectAll();
            break;
        }
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
  }, [selectAll, deselectAll]);

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
  }, [selectedIds, rectangles]);

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
            return updateRectangle(id, {
              x: newPos.x,
              y: newPos.y,
              x2: newPos.x2,
              y2: newPos.y2,
              lastModifiedBy: user.email || (shape?.createdBy || user.email)
            });
          } else {
            return updateRectangle(id, {
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
  }, [selectedIds, multiDragPositions, rectangles, user, updateRectangle]);

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

    // Handle drag-select
    if (isDragSelecting && dragSelectRect) {
      // Convert current mouse position to canvas coordinates
      const canvasX = (pos.x - viewport.x) / viewport.scale;
      const canvasY = (pos.y - viewport.y) / viewport.scale;
      const width = canvasX - dragSelectRect.x;
      const height = canvasY - dragSelectRect.y;
      const newRect = { ...dragSelectRect, width, height };
      setDragSelectRect(newRect);
      
      // Broadcast live selection to other users
      if (user) {
        setLiveSelection(
          user.userId,
          user.email,
          user.firstName,
          'drag-select',
          newRect.x,
          newRect.y,
          newRect.width,
          newRect.height,
          selectedIds
        );
      }
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
    // (convert screen coords to canvas coords)
    const canvasX = (pos.x - viewport.x) / viewport.scale;
    const canvasY = (pos.y - viewport.y) / viewport.scale;
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
      
      // Broadcast final multi-selection to other users
      if (user && shapesInRect.length > 0) {
        setLiveSelection(
          user.userId,
          user.email,
          user.firstName,
          'multi-select',
          0, 0, 0, 0, // No rectangle for multi-select
          shapesInRect.map(shape => shape.id)
        );
      }
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
                    {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id] } as any)}
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
                    {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id] } as any)}
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
              {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id] } as any)}
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
              {...({ onMultiDragStart: startMultiDrag, onMultiDragUpdate: updateMultiDrag, onMultiDragEnd: endMultiDrag, multiDragPosition: multiDragPositions[shape.id] } as any)}
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
        <Layer listening={false}>
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

        {/* Live Selections from Other Users */}
        {Object.entries(liveSelections).map(([userId, selection]) => {
          if (userId === user?.userId) return null; // Don't show own selection
          
          return (
            <Layer key={userId} listening={false}>
              {/* Only show rectangle for drag-select */}
              {selection.selectionType === 'drag-select' && (
                <Rect
                  x={selection.x}
                  y={selection.y}
                  width={selection.width}
                  height={selection.height}
                  fill="rgba(255, 152, 0, 0.1)"
                  stroke="#FF9800"
                  strokeWidth={1}
                  dash={[5, 5]}
                />
              )}
              
              {/* Show selection indicators for multi-select */}
              {selection.selectionType === 'multi-select' && selection.selectedIds && 
                selection.selectedIds.map((shapeId) => {
                  const shape = rectangles.find(r => r.id === shapeId);
                  if (!shape) return null;
                  
                  return (
                    <Rect
                      key={shapeId}
                      x={shape.x - 2}
                      y={shape.y - 2}
                      width={(shape as any).width + 4}
                      height={(shape as any).height + 4}
                      fill="rgba(76, 175, 80, 0.1)"
                      stroke="#4CAF50"
                      strokeWidth={2}
                      dash={[3, 3]}
                    />
                  );
                })
              }
              
              {/* User label */}
              <Rect
                x={selection.x}
                y={selection.y - 20}
                width={Math.max(100, selection.userName.length * 8 + 16)}
                height={16}
                fill="rgba(0, 0, 0, 0.7)"
                cornerRadius={4}
              />
              <KonvaText
                x={selection.x + 8}
                y={selection.y - 16}
                text={selection.userName}
                fontSize={10}
                fill="white"
                listening={false}
              />
            </Layer>
          );
        })}
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
