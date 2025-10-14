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
    console.log('[useCursors] User changed:', user?.email);
    userIdRef.current = user?.userId || null;
  }

  // Initialize throttled update function
  useEffect(() => {
    if (!user) {
      console.log('[useCursors] No user in throttle effect');
      throttledUpdate.current = null;
      return;
    }

    console.log('[useCursors] Creating throttled update for user:', user.email);
    // Create throttled function for cursor updates (8ms = 120 FPS for smooth cursor movement)
    throttledUpdate.current = throttle((x: number, y: number) => {
      const firstName = user.firstName || 'User';
      const lastName = user.lastName || '';
      updateCursorPosition(user.userId, user.email, firstName, lastName, x, y);
    }, 8);

    // Cleanup: Remove cursor on unmount
    return () => {
      if (user) {
        console.log('[useCursors] Cleanup: removing cursor for', user.email);
        removeCursor(user.userId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.email]);

  // Subscribe to all cursors
  useEffect(() => {
    if (!user) {
      console.log('[useCursors] No user, skipping cursor subscription');
      return;
    }

    console.log('[useCursors] Subscribing to cursors for user:', user.email);
    const unsubscribe = subscribeToCursors((allCursors) => {
      console.log('[useCursors] Received cursors update:', Object.keys(allCursors).length, 'total cursors');
      
      // Store all cursors (CursorOverlay will filter out own cursor)
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
