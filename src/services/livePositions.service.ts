// Live Positions service for RTDB (ephemeral real-time position streaming)
// Streams intermediate positions during drag/resize for smooth real-time rendering (60 FPS)
// This allows other users to see shapes moving smoothly, not just final results
import {
  ref,
  set,
  remove,
  onValue,
  onDisconnect,
  Unsubscribe,
} from 'firebase/database';
import { rtdb } from './firebase';
import { CANVAS_ID } from '../utils/constants';

/**
 * Live position data structure
 * Represents the current position/size of a shape being edited
 */
export interface LivePosition {
  userId: string; // Who is moving/resizing this shape
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number; // Z-index for instant layer updates (bring to front)
  lastUpdate: number; // Timestamp
}

/**
 * Get the RTDB reference for a shape's live position
 */
function getLivePositionRef(shapeId: string) {
  return ref(rtdb, `livePositions/${CANVAS_ID}/${shapeId}`);
}

/**
 * Set live position for a shape during drag/resize
 * Should be called on dragMove/resizeMove (throttled to 16ms for 60 FPS)
 * Auto-clears on disconnect via onDisconnect hook
 * 
 * @param shapeId - ID of the shape being moved/resized
 * @param userId - Current user's ID
 * @param x - Current x position
 * @param y - Current y position
 * @param width - Current width
 * @param height - Current height
 * @param zIndex - Optional z-index for instant layer updates
 */
export async function setLivePosition(
  shapeId: string,
  userId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex?: number
): Promise<void> {
  const livePositionRef = getLivePositionRef(shapeId);

  const positionData: LivePosition = {
    userId,
    x,
    y,
    width,
    height,
    ...(zIndex !== undefined && { zIndex }),
    lastUpdate: Date.now(),
  };

  console.log('[livePositions.service] Setting live position:', { shapeId, userId, x, y });

  try {
    // Don't await - fire and forget for speed, handle errors separately
    set(livePositionRef, positionData).catch((error) => {
      // Silently handle RTDB write failures to prevent blocking
      console.warn('[livePositions.service] RTDB write failed (non-blocking):', error.message);
    });

    // Configure auto-cleanup on disconnect (don't await)
    onDisconnect(livePositionRef).remove().catch((error) => {
      console.warn('[livePositions.service] onDisconnect setup failed (non-blocking):', error.message);
    });
  } catch (error) {
    console.error('[livePositions.service] Failed to set live position:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Clear live position for a shape
 * Called when drag/resize ends (mouseup)
 * 
 * @param shapeId - ID of the shape no longer being moved/resized
 */
export async function clearLivePosition(shapeId: string): Promise<void> {
  const livePositionRef = getLivePositionRef(shapeId);

  try {
    await remove(livePositionRef);
    // Cancel onDisconnect if manually clearing
    await onDisconnect(livePositionRef).cancel();
  } catch (error) {
    console.error('Failed to clear live position:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Subscribe to all live positions for the current canvas
 * 
 * @param callback - Called with map of shapeId -> LivePosition
 * @returns Unsubscribe function
 */
export function subscribeToLivePositions(
  callback: (livePositions: Record<string, LivePosition>) => void
): Unsubscribe {
  const allLivePositionsRef = ref(rtdb, `livePositions/${CANVAS_ID}`);

  return onValue(
    allLivePositionsRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('Error subscribing to live positions:', error);
      callback({});
    }
  );
}

/**
 * Subscribe to live position for a SPECIFIC shape only
 * This is more efficient than subscribing to all shapes when you only need one.
 * Use this when you know a specific shape is being edited by another user.
 * 
 * @param shapeId - The specific shape ID to monitor
 * @param callback - Called with LivePosition or null when position updates/clears
 * @returns Unsubscribe function
 */
export function subscribeToShapeLivePosition(
  shapeId: string,
  callback: (livePosition: LivePosition | null) => void
): Unsubscribe {
  const shapeLivePositionRef = getLivePositionRef(shapeId);

  return onValue(
    shapeLivePositionRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || null);
    },
    (error) => {
      console.error(`Error subscribing to live position for shape ${shapeId}:`, error);
      callback(null);
    }
  );
}

