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

  console.log('[usePresence] Hook initialized, user:', user?.email, 'online users count:', onlineUsers.length);

  // Set up presence on mount
  useEffect(() => {
    if (!user?.userId || !user?.email) {
      console.log('[usePresence] User not ready:', { userId: user?.userId, email: user?.email });
      return;
    }

    // Use firstName/lastName if available, otherwise use 'User' as fallback
    const firstName = user.firstName || 'User';
    const lastName = user.lastName || '';

    console.log('[usePresence] Setting user online:', user.userId, { firstName, lastName });

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
      console.log('[usePresence] Cleaning up presence for:', user.userId);

      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Only set user offline on actual unmount, not during React Strict Mode double-mount
      // The onDisconnect handler in Firebase will auto-cleanup if connection is lost
      // We rely on that + the beforeunload handler for actual cleanup

      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // Subscribe to presence updates
  useEffect(() => {
    console.log('[usePresence] Subscribing to presence updates');

    const unsubscribe = subscribeToPresence((presenceMap) => {
      // Convert presence map to array and filter for online users
      const users = Object.values(presenceMap).filter((p) => p.online);
      setOnlineUsers(users);
      console.log('[usePresence] Online users:', users.length);
    });

    return () => {
      console.log('[usePresence] Unsubscribing from presence');
      unsubscribe();
    };
  }, []);

  // Subscribe to connection state
  useEffect(() => {
    console.log('[usePresence] Subscribing to connection state');

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
          duration: 2000,
          position: 'bottom-center',
        });
      } else if (!connected && wasConnectedRef.current === true) {
        toast.error('Connection lost. Reconnecting...', {
          duration: Infinity, // Keep showing until reconnected
          position: 'bottom-center',
        });
      }

      wasConnectedRef.current = connected;
    });

    return () => {
      console.log('[usePresence] Unsubscribing from connection state');
      unsubscribe();
    };
  }, []);

  return {
    onlineUsers,
    isConnected,
  };
}
