// Live Selections service for RTDB (ephemeral real-time selection broadcasting)
// Broadcasts which shapes each user has selected for visual indicators
// This allows other users to see selections in real-time with hover text
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
 * Live selection data structure
 * Represents which shapes a user currently has selected
 */
export interface LiveSelection {
  userId: string; // Who has selected these shapes
  userEmail: string;
  userName: string; // First name for display
  selectedIds: string[]; // Array of selected shape IDs
  cursorColor: string; // User's cursor color for visual consistency
  lastUpdate: number; // Timestamp
}

export interface LiveSelections {
  [userId: string]: LiveSelection;
}

/**
 * Get the RTDB reference for a user's live selections
 */
function getLiveSelectionRef(userId: string) {
  return ref(rtdb, `liveSelections/${CANVAS_ID}/${userId}`);
}

/**
 * Set live selection for current user
 * Auto-clears on disconnect via onDisconnect hook
 * 
 * @param userId - Current user's ID
 * @param userEmail - Current user's email
 * @param userName - Current user's first name
 * @param selectedIds - Array of selected shape IDs
 * @param cursorColor - User's cursor color for visual consistency
 */
export async function setLiveSelection(
  userId: string,
  userEmail: string,
  userName: string,
  selectedIds: string[],
  cursorColor: string
): Promise<void> {
  const selectionRef = getLiveSelectionRef(userId);

  // If no shapes selected, clear the selection
  if (selectedIds.length === 0) {
    return clearLiveSelection(userId);
  }

  const selectionData: LiveSelection = {
    userId,
    userEmail,
    userName,
    selectedIds: selectedIds.filter(id => id !== undefined && id !== null),
    cursorColor,
    lastUpdate: Date.now(),
  };

  try {
    // Don't await - fire and forget for speed, handle errors separately
    set(selectionRef, selectionData).catch((error) => {
      // Silently handle RTDB write failures to prevent blocking
      console.warn('[liveSelections.service] RTDB write failed (non-blocking):', error.message);
    });

    // Configure auto-cleanup on disconnect (don't await)
    onDisconnect(selectionRef).remove().catch((error) => {
      console.warn('[liveSelections.service] onDisconnect setup failed (non-blocking):', error.message);
    });
  } catch (error) {
    console.error('[liveSelections.service] Failed to set live selection:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Clear live selection for current user
 * Called when user deselects all shapes
 * 
 * @param userId - Current user's ID
 */
export async function clearLiveSelection(userId: string): Promise<void> {
  const selectionRef = getLiveSelectionRef(userId);

  try {
    await remove(selectionRef);
    // Cancel onDisconnect if manually clearing
    await onDisconnect(selectionRef).cancel();
  } catch (error) {
    console.error('Failed to clear live selection:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Subscribe to all live selections for the current canvas
 * 
 * @param callback - Called with map of userId -> LiveSelection
 * @returns Unsubscribe function
 */
export function subscribeToLiveSelections(
  callback: (liveSelections: Record<string, LiveSelection>) => void
): Unsubscribe {
  const allLiveSelectionsRef = ref(rtdb, `liveSelections/${CANVAS_ID}`);

  return onValue(
    allLiveSelectionsRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('Error subscribing to live selections:', error);
      callback({});
    }
  );
}

/**
 * Subscribe to live selection for a SPECIFIC user only
 * This is more efficient than subscribing to all users when you only need one.
 * 
 * @param userId - The specific user ID to monitor
 * @param callback - Called with LiveSelection or null when selection updates/clears
 * @returns Unsubscribe function
 */
export function subscribeToUserLiveSelection(
  userId: string,
  callback: (liveSelection: LiveSelection | null) => void
): Unsubscribe {
  const userLiveSelectionRef = getLiveSelectionRef(userId);

  return onValue(
    userLiveSelectionRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || null);
    },
    (error) => {
      console.error(`Error subscribing to live selection for user ${userId}:`, error);
      callback(null);
    }
  );
}