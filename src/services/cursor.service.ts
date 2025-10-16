// Cursor service for RTDB (ephemeral multiplayer cursor positions)
// Tracks where each user's mouse is on the canvas in real-time (60 FPS)
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
import { Cursor } from '../types/cursor.types';

/**
 * Color definitions with names for cursor labels
 */
const CURSOR_COLORS = [
  { name: 'Red', hex: '#FF6B6B' },
  { name: 'Teal', hex: '#4ECDC4' },
  { name: 'Blue', hex: '#45B7D1' },
  { name: 'Salmon', hex: '#FFA07A' },
  { name: 'Mint', hex: '#98D8C8' },
  { name: 'Yellow', hex: '#F7DC6F' },
  { name: 'Purple', hex: '#BB8FCE' },
  { name: 'Sky', hex: '#85C1E2' },
  { name: 'Orange', hex: '#F8B739' },
  { name: 'Green', hex: '#52B788' },
] as const;

/**
 * Get the RTDB reference for a user's cursor
 */
function getCursorRef(userId: string) {
  return ref(rtdb, `cursors/${CANVAS_ID}/${userId}`);
}

/**
 * Get deterministic color for a user based on email hash
 * Returns both color name (for label) and hex code (for rendering)
 */
export function getCursorColorForUser(email: string): {
  colorName: string;
  cursorColor: string;
} {
  // Simple hash function for email
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % CURSOR_COLORS.length;
  const color = CURSOR_COLORS[index];

  return {
    colorName: color.name,
    cursorColor: color.hex,
  };
}

// Cache colors per user to avoid recalculation
const colorCache = new Map<string, { colorName: string; cursorColor: string }>();

// Cache onDisconnect handlers to avoid creating multiple handlers per user
const disconnectHandlers = new Map<string, any>();

/**
 * Update cursor position in RTDB
 * Should be called on mousemove (throttled to 16ms for 60 FPS)
 * Auto-removes cursor on disconnect
 * 
 * @param userId - Current user's ID
 * @param email - Current user's email (for color generation)
 * @param firstName - Current user's first name
 * @param lastName - Current user's last name
 * @param x - Canvas x coordinate
 * @param y - Canvas y coordinate
 */
export async function updateCursorPosition(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  x: number,
  y: number
): Promise<void> {
  const cursorRef = getCursorRef(userId);
  
  // Get color from cache or calculate once
  let colorData = colorCache.get(userId);
  if (!colorData) {
    colorData = getCursorColorForUser(email);
    colorCache.set(userId, colorData);
  }

  const cursorData: Cursor = {
    x,
    y,
    userId,
    firstName,
    lastName,
    colorName: colorData.colorName,
    cursorColor: colorData.cursorColor,
    lastUpdate: Date.now(),
  };

  try {
    // Update position (don't await - fire and forget for speed)
    set(cursorRef, cursorData).catch((error) => {
      // Silently handle RTDB write failures to prevent blocking
      console.warn('[cursor.service] RTDB write failed (non-blocking):', error.message);
    });
    
    // Only set up onDisconnect handler once per user to avoid spam
    if (!disconnectHandlers.has(userId)) {
      const handler = onDisconnect(cursorRef);
      handler.remove();
      disconnectHandlers.set(userId, handler);
    }
    // Don't call onDisconnect on every update - use cached handler
  } catch (error) {
    console.error('[cursor.service] Failed to update cursor position:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Remove cursor from RTDB
 * Called when user leaves the canvas or signs out
 * 
 * @param userId - User whose cursor to remove
 */
export async function removeCursor(userId: string): Promise<void> {
  const cursorRef = getCursorRef(userId);

  try {
    await remove(cursorRef);
    // Cancel onDisconnect if manually removing
    const handler = disconnectHandlers.get(userId);
    if (handler) {
      await handler.cancel();
      disconnectHandlers.delete(userId);
    }
  } catch (error) {
    console.error('Failed to remove cursor:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Subscribe to all cursors for the current canvas
 * 
 * @param callback - Called with map of userId -> Cursor
 * @returns Unsubscribe function
 */
export function subscribeToCursors(
  callback: (cursors: Record<string, Cursor>) => void
): Unsubscribe {
  const allCursorsRef = ref(rtdb, `cursors/${CANVAS_ID}`);

  return onValue(
    allCursorsRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('[cursor.service] Error subscribing to cursors:', error);
      callback({});
    }
  );
}
