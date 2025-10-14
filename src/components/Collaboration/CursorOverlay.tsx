/**
 * CursorOverlay component
 * Renders other users' cursors with colored labels showing color names
 * Uses absolute positioning over the canvas
 */
import React from 'react';
import { Cursor } from '../../types/cursor.types';
import { useAuth } from '../../hooks/useAuth';

interface CursorOverlayProps {
  cursors: Record<string, Cursor>;
  viewportX: number;
  viewportY: number;
  scale: number;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
  cursors,
  viewportX,
  viewportY,
  scale,
}) => {
  const { user } = useAuth();

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1000 }}
    >
      {Object.entries(cursors)
        // Filter out own cursor - user sees their browser cursor
        .filter(([userId]) => userId !== user?.userId)
        .map(([userId, cursor]) => {
        // Transform cursor position to screen coordinates
        const screenX = cursor.x * scale + viewportX;
        const screenY = cursor.y * scale + viewportY;

        return (
          <div
            key={userId}
            className="absolute"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: 'translate(-2px, -2px)', // Slight offset for cursor tip
              // No transition - instant update for smooth cursor tracking
            }}
          >
            {/* Simple triangle cursor */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="0,0 0,14 8,8"
                fill={cursor.cursorColor}
                stroke="white"
                strokeWidth="1"
              />
            </svg>

            {/* Color name label */}
            <div
              className="absolute left-6 top-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: cursor.cursorColor,
                color: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {cursor.colorName}
            </div>
          </div>
        );
      })}
    </div>
  );
};
