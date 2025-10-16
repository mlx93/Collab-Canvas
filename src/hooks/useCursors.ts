/**
 * useCursors hook
 * Manages real-time cursor tracking for multiplayer collaboration
 * Throttles cursor updates to 60 FPS and filters out own cursor
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  updateCursorPosition,
  removeCursor,
  subscribeToCursors,
} from '../services/cursor.service';
import { Cursor } from '../types/cursor.types';
import { throttle } from '../utils/throttle';
import { useAuth } from './useAuth';

interface UseCursorsReturn {
  cursors: Record<string, Cursor>; // All cursors from RTDB (overlay will filter out own)
  updateOwnCursor: (x: number, y: number) => void;
}

export function useCursors(): UseCursorsReturn {
  const { user } = useAuth();
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const throttledUpdate = useRef<((x: number, y: number) => void) | null>(null);
  const userIdRef = useRef<string | null>(null);
  
  // Only log when userId actually changes
  if (userIdRef.current !== user?.userId) {
    userIdRef.current = user?.userId || null;
  }

  // Initialize throttled update function
  useEffect(() => {
    if (!user) {
      throttledUpdate.current = null;
      return;
    }

    // Create throttled function for cursor updates (16ms = 60 FPS for optimal balance)
    throttledUpdate.current = throttle((x: number, y: number) => {
      const firstName = user.firstName || 'User';
      const lastName = user.lastName || '';
      updateCursorPosition(user.userId, user.email, firstName, lastName, x, y);
    }, 16);

    // Cleanup: Remove cursor on unmount
    return () => {
      if (user) {
        removeCursor(user.userId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.email]);

  // Subscribe to all cursors
  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToCursors((allCursors) => {
      // Direct state update - React handles batching automatically
      setCursors(allCursors);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // Callback for updating own cursor position
  const updateOwnCursor = useCallback(
    (x: number, y: number) => {
      if (throttledUpdate.current) {
        throttledUpdate.current(x, y);
      }
    },
    [] // Empty deps - function reference never changes
  );

  return {
    cursors,
    updateOwnCursor,
  };
}
