import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  setUserOnline,
  setUserOffline,
  updateHeartbeat,
  subscribeToPresence,
  subscribeToConnectionState,
  PresenceData,
} from '../services/presence.service';
import toast from 'react-hot-toast';

interface UsePresenceReturn {
  onlineUsers: PresenceData[];
  isConnected: boolean;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function usePresence(): UsePresenceReturn {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceData[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasConnectedRef = useRef<boolean | null>(null); // null = initial state, not yet connected
  const isFirstConnectionRef = useRef(true);
  const previousUserIdRef = useRef<string | null>(null);


  // Set up presence on mount
  useEffect(() => {
    if (!user?.userId || !user?.email) {
      // If we had a user before but now we don't, they signed out - clean up presence
      if (previousUserIdRef.current) {
        setUserOffline(previousUserIdRef.current);
        previousUserIdRef.current = null;
      }
      
      return;
    }

    // Store current user ID for sign-out detection
    previousUserIdRef.current = user.userId;

    // Use firstName/lastName if available, otherwise use 'User' as fallback
    const firstName = user.firstName || 'User';
    const lastName = user.lastName || '';

    // Set user online
    setUserOnline(user.userId, user.email, firstName, lastName).catch((error) => {
      console.error('[usePresence] Failed to set user online:', error);
    });

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      updateHeartbeat(user.userId).catch((error) => {
        console.error('[usePresence] Heartbeat failed:', error);
      });
    }, HEARTBEAT_INTERVAL);

    // Cleanup on unmount or window close
    const handleBeforeUnload = () => {
      setUserOffline(user.userId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Don't call setUserOffline here - it will be handled when user becomes null
      // This prevents React Strict Mode from setting users offline during double-mount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribe = subscribeToPresence((presenceMap) => {
      // Convert presence map to array and filter for online users
      const users = Object.values(presenceMap).filter((p) => p.online);
      setOnlineUsers(users);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to connection state
  useEffect(() => {
    const unsubscribe = subscribeToConnectionState((connected) => {
      setIsConnected(connected);

      // Skip toasts on first connection (initial load)
      if (isFirstConnectionRef.current) {
        isFirstConnectionRef.current = false;
        wasConnectedRef.current = connected;
        return;
      }

      // Show toast notifications on connection changes (after initial load)
      if (connected && wasConnectedRef.current === false) {
        toast.success('Connected', {
          id: 'connection-status', // Use fixed ID to prevent duplicates
          duration: 2000,
          position: 'bottom-center',
        });
      } else if (!connected && wasConnectedRef.current === true) {
        toast.error('Connection lost. Reconnecting...', {
          id: 'connection-status', // Use fixed ID to prevent duplicates
          duration: Infinity, // Keep showing until reconnected
          position: 'bottom-center',
        });
      }

      wasConnectedRef.current = connected;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    onlineUsers,
    isConnected,
  };
}
