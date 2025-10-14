import { ref, set, onValue, onDisconnect } from 'firebase/database';
import {
  setUserOnline,
  setUserOffline,
  updateHeartbeat,
  subscribeToPresence,
  subscribeToConnectionState,
} from '../presence.service';

// Mock Firebase database
jest.mock('../firebase', () => ({
  rtdb: {},
}));

jest.mock('firebase/database');

const mockRef = ref as jest.MockedFunction<typeof ref>;
const mockSet = set as jest.MockedFunction<typeof set>;
const mockOnValue = onValue as jest.MockedFunction<typeof onValue>;
const mockOnDisconnect = onDisconnect as jest.MockedFunction<typeof onDisconnect>;

describe('presence.service', () => {
  let capturedData: any = null;
  let mockDisconnectRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedData = null;

    // Mock ref to return a reference object
    mockRef.mockReturnValue({ toString: () => 'presence/default-canvas/user123' } as any);

    // Mock set to capture data
    mockSet.mockImplementation(async (ref: any, data: any) => {
      capturedData = data;
      return Promise.resolve();
    });

    // Mock onDisconnect
    mockDisconnectRef = {
      set: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    mockOnDisconnect.mockReturnValue(mockDisconnectRef);
  });

  describe('setUserOnline', () => {
    it('should set user as online with correct data structure', async () => {
      await setUserOnline('user123', 'test@example.com', 'John', 'Doe');

      expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'presence/default-canvas/user123');
      expect(mockSet).toHaveBeenCalled();
      expect(capturedData).toMatchObject({
        userId: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        online: true,
      });
      expect(capturedData.joinedAt).toBeDefined();
      expect(capturedData.lastSeen).toBeDefined();
    });

    it('should configure onDisconnect hook', async () => {
      await setUserOnline('user123', 'test@example.com', 'John', 'Doe');

      expect(mockOnDisconnect).toHaveBeenCalled();
      expect(mockDisconnectRef.set).toHaveBeenCalled();

      // Check that onDisconnect sets online: false
      const disconnectData = mockDisconnectRef.set.mock.calls[0][0];
      expect(disconnectData.online).toBe(false);
      expect(disconnectData.userId).toBe('user123');
    });

    it('should use correct canvas ID (default-canvas)', async () => {
      await setUserOnline('user123', 'test@example.com', 'John', 'Doe');

      expect(mockRef).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('default-canvas')
      );
    });

    it('should include firstName and lastName', async () => {
      await setUserOnline('user123', 'test@example.com', 'Jane', 'Smith');

      expect(capturedData).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
      });
    });
  });

  describe('setUserOffline', () => {
    it('should set user as offline', async () => {
      // Mock onValue to return existing user data
      mockOnValue.mockImplementation((ref: any, callback: any) => {
        callback({
          val: () => ({
            userId: 'user123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            online: true,
            joinedAt: Date.now() - 1000,
            lastSeen: Date.now() - 500,
          }),
        });
        return jest.fn();
      });

      await setUserOffline('user123');

      expect(mockSet).toHaveBeenCalled();
      expect(capturedData.online).toBe(false);
      expect(capturedData.lastSeen).toBeDefined();
    });

    it('should cancel onDisconnect handler', async () => {
      mockOnValue.mockImplementation((ref: any, callback: any) => {
        callback({
          val: () => ({
            userId: 'user123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            online: true,
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          }),
        });
        return jest.fn();
      });

      await setUserOffline('user123');

      expect(mockOnDisconnect).toHaveBeenCalled();
      expect(mockDisconnectRef.cancel).toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      mockOnValue.mockImplementation((ref: any, callback: any, errorCallback: any) => {
        errorCallback(new Error('Test error'));
        return jest.fn();
      });

      await expect(setUserOffline('user123')).resolves.not.toThrow();
    });
  });

  describe('updateHeartbeat', () => {
    it('should update lastSeen timestamp', async () => {
      mockOnValue.mockImplementation((ref: any, callback: any) => {
        callback({
          val: () => ({
            userId: 'user123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            online: true,
            joinedAt: Date.now() - 10000,
            lastSeen: Date.now() - 5000,
          }),
        });
        return jest.fn();
      });

      const oldTime = Date.now() - 5000;
      await updateHeartbeat('user123');

      expect(mockSet).toHaveBeenCalled();
      expect(capturedData.lastSeen).toBeGreaterThan(oldTime);
      expect(capturedData.online).toBe(true);
    });

    it('should not throw on error', async () => {
      mockOnValue.mockImplementation((ref: any, callback: any, errorCallback: any) => {
        errorCallback(new Error('Test error'));
        return jest.fn();
      });

      await expect(updateHeartbeat('user123')).resolves.not.toThrow();
    });
  });

  describe('subscribeToPresence', () => {
    it('should set up RTDB listener for presence', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOnValue.mockReturnValue(mockUnsubscribe);

      const unsubscribe = subscribeToPresence(callback);

      expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'presence/default-canvas');
      expect(mockOnValue).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should call callback with presence data', () => {
      const callback = jest.fn();

      mockOnValue.mockImplementation((ref: any, successCallback: any) => {
        successCallback({
          val: () => ({
            user1: {
              userId: 'user1',
              email: 'user1@example.com',
              firstName: 'User',
              lastName: 'One',
              online: true,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
            user2: {
              userId: 'user2',
              email: 'user2@example.com',
              firstName: 'User',
              lastName: 'Two',
              online: true,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          }),
        });
        return jest.fn();
      });

      subscribeToPresence(callback);

      expect(callback).toHaveBeenCalled();
      const presenceMap = callback.mock.calls[0][0];
      expect(presenceMap.user1).toBeDefined();
      expect(presenceMap.user2).toBeDefined();
      expect(presenceMap.user1.online).toBe(true);
    });

    it('should handle empty presence data', () => {
      const callback = jest.fn();

      mockOnValue.mockImplementation((ref: any, successCallback: any) => {
        successCallback({ val: () => null });
        return jest.fn();
      });

      subscribeToPresence(callback);

      expect(callback).toHaveBeenCalledWith({});
    });

    it('should handle errors gracefully', () => {
      const callback = jest.fn();

      mockOnValue.mockImplementation((ref: any, successCallback: any, errorCallback: any) => {
        errorCallback(new Error('Test error'));
        return jest.fn();
      });

      subscribeToPresence(callback);

      expect(callback).toHaveBeenCalledWith({});
    });
  });

  describe('subscribeToConnectionState', () => {
    it('should listen to .info/connected path', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOnValue.mockReturnValue(mockUnsubscribe);

      subscribeToConnectionState(callback);

      expect(mockRef).toHaveBeenCalledWith(expect.anything(), '.info/connected');
      expect(mockOnValue).toHaveBeenCalled();
    });

    it('should call callback with connection state', () => {
      const callback = jest.fn();

      mockOnValue.mockImplementation((ref: any, successCallback: any) => {
        successCallback({ val: () => true });
        return jest.fn();
      });

      subscribeToConnectionState(callback);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should handle disconnection', () => {
      const callback = jest.fn();

      mockOnValue.mockImplementation((ref: any, successCallback: any) => {
        successCallback({ val: () => false });
        return jest.fn();
      });

      subscribeToConnectionState(callback);

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should handle errors gracefully', () => {
      const callback = jest.fn();

      mockOnValue.mockImplementation((ref: any, successCallback: any, errorCallback: any) => {
        errorCallback(new Error('Test error'));
        return jest.fn();
      });

      subscribeToConnectionState(callback);

      expect(callback).toHaveBeenCalledWith(false);
    });
  });
});

