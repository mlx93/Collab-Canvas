import { ref, set, onValue, onDisconnect, Unsubscribe } from 'firebase/database';
import { rtdb } from './firebase';
import { CANVAS_ID } from '../utils/constants';

export interface PresenceData {
  userId: string;
  email: string; // Used as display name
  firstName: string;
  lastName: string;
  online: boolean;
  joinedAt: number;
  lastSeen: number;
}

function getPresenceRef(userId: string) {
  return ref(rtdb, `presence/${CANVAS_ID}/${userId}`);
}

/**
 * Set a user as online in the presence system
 * Automatically sets up onDisconnect to mark user as offline
 */
export async function setUserOnline(
  userId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<void> {
  const presenceRef = getPresenceRef(userId);

  const presenceData: PresenceData = {
    userId,
    email,
    firstName,
    lastName,
    online: true,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
  };

  try {
    // Set user as online
    await set(presenceRef, presenceData);

    // Configure auto-cleanup when user disconnects
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.set({
      ...presenceData,
      online: false,
      lastSeen: Date.now(),
    });
  } catch (error) {
    console.error('[presence.service] Failed to set user online:', error);
    throw error;
  }
}

/**
 * Set a user as offline in the presence system
 */
export async function setUserOffline(userId: string): Promise<void> {
  const presenceRef = getPresenceRef(userId);

  try {
    // Get current data to preserve it
    const snapshot = await new Promise<any>((resolve, reject) => {
      let unsubscribe: (() => void) | null = null;
      
      unsubscribe = onValue(
        presenceRef,
        (snap) => {
          if (unsubscribe) unsubscribe();
          resolve(snap.val());
        },
        (error) => {
          if (unsubscribe) unsubscribe();
          reject(error);
        }
      );
    });

    if (snapshot) {
      await set(presenceRef, {
        ...snapshot,
        online: false,
        lastSeen: Date.now(),
      });
    }

    // Cancel the onDisconnect handler since we're manually setting offline
    await onDisconnect(presenceRef).cancel();
  } catch (error) {
    console.error('[presence.service] Failed to set user offline:', error);
    // Don't throw - offline status is non-critical
  }
}

/**
 * Update the lastSeen timestamp for a user (heartbeat)
 */
export async function updateHeartbeat(userId: string): Promise<void> {
  const presenceRef = getPresenceRef(userId);

  try {
    const snapshot = await new Promise<any>((resolve, reject) => {
      let unsubscribe: (() => void) | null = null;
      
      unsubscribe = onValue(
        presenceRef,
        (snap) => {
          if (unsubscribe) unsubscribe();
          resolve(snap.val());
        },
        (error) => {
          if (unsubscribe) unsubscribe();
          reject(error);
        }
      );
    });

    if (snapshot) {
      await set(presenceRef, {
        ...snapshot,
        lastSeen: Date.now(),
      });
    }
  } catch (error) {
    console.error('[presence.service] Failed to update heartbeat:', error);
    // Don't throw - heartbeat failures are non-critical
  }
}

/**
 * Subscribe to presence updates for all users on the canvas
 */
export function subscribeToPresence(
  callback: (presenceMap: Record<string, PresenceData>) => void
): Unsubscribe {
  const allPresenceRef = ref(rtdb, `presence/${CANVAS_ID}`);

  return onValue(
    allPresenceRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data || {});
    },
    (error) => {
      console.error('[presence.service] Error subscribing to presence:', error);
      callback({});
    }
  );
}

/**
 * Subscribe to Firebase connection state
 */
export function subscribeToConnectionState(
  callback: (connected: boolean) => void
): Unsubscribe {
  const connectedRef = ref(rtdb, '.info/connected');

  return onValue(
    connectedRef,
    (snapshot) => {
      const connected = snapshot.val() === true;
      callback(connected);
    },
    (error) => {
      console.error('[presence.service] Error subscribing to connection state:', error);
      callback(false);
    }
  );
}
