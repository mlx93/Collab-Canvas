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
 */
export async function setLivePosition(
  shapeId: string,
  userId: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  const livePositionRef = getLivePositionRef(shapeId);

  const positionData: LivePosition = {
    userId,
    x,
    y,
    width,
    height,
    lastUpdate: Date.now(),
  };

  console.log('[livePositions.service] Setting live position:', { shapeId, userId, x, y });

  try {
    await set(livePositionRef, positionData);
    console.log('[livePositions.service] Live position set successfully');

    // Configure auto-cleanup on disconnect
    await onDisconnect(livePositionRef).remove();
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

