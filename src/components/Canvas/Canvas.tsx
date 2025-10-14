// Canvas component with Konva.js - pan, zoom, and off-white background
import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { useCanvas } from '../../hooks/useCanvas';
import { useCursors } from '../../hooks/useCursors';
import { FPSCounter } from './FPSCounter';
import { Rectangle } from './Rectangle';
import { CursorOverlay } from '../Collaboration/CursorOverlay';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BACKGROUND,
  MIN_ZOOM,
  MAX_ZOOM
} from '../../utils/constants';

export const Canvas: React.FC = () => {
  const { viewport, setViewport, panViewport, zoomViewport, rectangles, selectedRectangleId, setSelectedRectangle, setStageSize: updateContextStageSize } = useCanvas();
  const { cursors, updateOwnCursor } = useCursors();
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

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

  // Handle pan (drag empty space) - manual implementation
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Check if clicked on background (deselect all)
    const clickedOnEmpty = e.target === e.target.getStage() || (e.target.getClassName() === 'Rect' && e.target.listening() === false);
    if (clickedOnEmpty) {
      setSelectedRectangle(null);
      
      // Start panning
      setIsDragging(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        lastPosRef.current = { x: pos.x, y: pos.y };
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Update cursor position for multiplayer (convert screen coords to canvas coords)
    const canvasX = (pos.x - viewport.x) / viewport.scale;
    const canvasY = (pos.y - viewport.y) / viewport.scale;
    // console.log('[Canvas] Updating cursor position:', canvasX, canvasY);
    updateOwnCursor(canvasX, canvasY);

    // Handle panning if dragging
    if (isDragging && lastPosRef.current) {
      // Calculate the delta movement in screen space
      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;

      // Use panViewport to update based on delta (handles state correctly)
      panViewport(dx, dy);

      // Update last position for next delta calculation
      lastPosRef.current = { x: pos.x, y: pos.y };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    lastPosRef.current = null;
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

          {/* Rectangles - sorted by z-index (lower z-index = further back) */}
          {rectangles
            .sort((a, b) => a.zIndex - b.zIndex) // Lower z-index renders first (back layer)
            .map((rectangle) => (
              <Rectangle
                key={rectangle.id}
                rectangle={rectangle}
                isSelected={selectedRectangleId === rectangle.id}
                onSelect={() => setSelectedRectangle(rectangle.id)}
                showIndicator={false}
                updateOwnCursor={updateOwnCursor}
              />
            ))}
        </Layer>

        {/* Indicators Layer - Always on top of all shapes */}
        <Layer listening={false}>
          {rectangles.map((rectangle) => (
            <Rectangle
              key={`indicator-${rectangle.id}`}
              rectangle={rectangle}
              isSelected={false}
              onSelect={() => {}}
              showIndicator={true}
              renderOnlyIndicator={true}
            />
          ))}
        </Layer>
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
    </div>
  );
};
