// Selection service for RTDB (ephemeral selection state)
// Tracks which shapes each user has selected (does NOT persist across refreshes)
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
 * Selection data structure
 */
export interface Selection {
  selectedShapeId: string | null;
  selectedAt: number; // Timestamp
}

/**
 * Get the RTDB reference for a user's selection
 */
function getSelectionRef(userId: string) {
  return ref(rtdb, `selections/${CANVAS_ID}/${userId}`);
}

/**
 * Set selection state for current user
 * Auto-clears on disconnect via onDisconnect hook
 * 
 * @param userId - Current user's ID
 * @param selectedShapeId - ID of the selected shape (or null for no selection)
 */
export async function setSelection(
  userId: string,
  selectedShapeId: string | null
): Promise<void> {
  const selectionRef = getSelectionRef(userId);

  if (selectedShapeId === null) {
    // No shape selected - remove selection
    return clearSelection(userId);
  }

  const selectionData: Selection = {
    selectedShapeId,
    selectedAt: Date.now(),
  };

  try {
    await set(selectionRef, selectionData);

    // Configure auto-cleanup on disconnect
    await onDisconnect(selectionRef).remove();
  } catch (error) {
    console.error('Failed to set selection:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Clear selection state for current user
 * Called when user deselects a shape
 * 
 * @param userId - Current user's ID
 */
export async function clearSelection(userId: string): Promise<void> {
  const selectionRef = getSelectionRef(userId);

  try {
    await remove(selectionRef);
    // Cancel onDisconnect if manually clearing
    await onDisconnect(selectionRef).cancel();
  } catch (error) {
    console.error('Failed to clear selection:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Subscribe to all selections for the current canvas
 * 
 * @param callback - Called with map of userId -> Selection
 * @returns Unsubscribe function
 */
export function subscribeToSelections(
  callback: (selections: Record<string, Selection>) => void
): Unsubscribe {
  const allSelectionsRef = ref(rtdb, `selections/${CANVAS_ID}`);

  return onValue(
    allSelectionsRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('Error subscribing to selections:', error);
      callback({});
    }
  );
}
