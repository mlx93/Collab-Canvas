// Active Edits service for RTDB (ephemeral collaboration state)
// Tracks which users are actively editing which shapes for visual indicators
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
 * Active edit action types
 */
export type EditAction = 'moving' | 'resizing' | 'recoloring' | 'editing';

/**
 * Active edit data structure
 */
export interface ActiveEdit {
  userId: string;
  email: string;
  firstName: string; // User's first name for display
  action: EditAction;
  cursorColor: string; // User's assigned cursor color
  startedAt: number; // Timestamp
}

/**
 * Get the RTDB reference for a shape's active edits
 */
function getActiveEditRef(shapeId: string) {
  return ref(rtdb, `activeEdits/${CANVAS_ID}/${shapeId}`);
}

/**
 * Set active edit state for a shape
 * Auto-clears on disconnect via onDisconnect hook
 * 
 * @param shapeId - ID of the shape being edited
 * @param userId - Current user's ID
 * @param email - Current user's email
 * @param firstName - Current user's first name for display
 * @param action - Type of edit action
 * @param cursorColor - User's cursor color for visual indicator
 */
export async function setActiveEdit(
  shapeId: string,
  userId: string,
  email: string,
  firstName: string,
  action: EditAction,
  cursorColor: string
): Promise<void> {
  const editRef = getActiveEditRef(shapeId);
  
  const editData: ActiveEdit = {
    userId,
    email,
    firstName,
    action,
    cursorColor,
    startedAt: Date.now(),
  };

  try {
    // Set the active edit
    await set(editRef, editData);
    
    // Configure auto-cleanup on disconnect
    await onDisconnect(editRef).remove();
  } catch (error) {
    console.error('Failed to set active edit:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Clear active edit state for a shape
 * Called when user finishes editing (mouseup, blur, etc)
 * 
 * @param shapeId - ID of the shape no longer being edited
 */
export async function clearActiveEdit(shapeId: string): Promise<void> {
  const editRef = getActiveEditRef(shapeId);
  
  try {
    await remove(editRef);
    // Also cancel the onDisconnect (in case user manually ended edit)
    await onDisconnect(editRef).cancel();
  } catch (error) {
    console.error('Failed to clear active edit:', error);
    // Don't throw - collaboration features are non-critical
  }
}

/**
 * Subscribe to active edits for a specific shape
 * 
 * @param shapeId - ID of the shape to monitor
 * @param callback - Called when active edit state changes
 * @returns Unsubscribe function
 */
export function subscribeToActiveEdit(
  shapeId: string,
  callback: (activeEdit: ActiveEdit | null) => void
): Unsubscribe {
  const editRef = getActiveEditRef(shapeId);
  
  return onValue(
    editRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data ? (data as ActiveEdit) : null);
    },
    (error) => {
      console.error('Error subscribing to active edit:', error);
      callback(null);
    }
  );
}

/**
 * Subscribe to all active edits for the current canvas
 * 
 * @param callback - Called with map of shapeId -> ActiveEdit
 * @returns Unsubscribe function
 */
export function subscribeToAllActiveEdits(
  callback: (activeEdits: Record<string, ActiveEdit>) => void
): Unsubscribe {
  const allEditsRef = ref(rtdb, `activeEdits/${CANVAS_ID}`);
  
  return onValue(
    allEditsRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('Error subscribing to all active edits:', error);
      callback({});
    }
  );
}

/**
 * Get a deterministic cursor color for a user
 * Based on email hash for consistency across sessions
 */
export function getUserCursorColor(email: string): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
    '#F8B739', // Orange
    '#52B788', // Green
  ];
  
  // Simple hash function for email
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
