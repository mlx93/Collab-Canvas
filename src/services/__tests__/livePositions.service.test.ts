/**
 * Unit tests for livePositions.service.ts
 * Tests RTDB live position streaming for real-time drag/resize
 */
import {
  setLivePosition,
  clearLivePosition,
  subscribeToLivePositions,
} from '../livePositions.service';
import { ref, set, remove, onValue, onDisconnect } from 'firebase/database';
import { rtdb } from '../firebase';

// Mock Firebase RTDB
jest.mock('firebase/database');
jest.mock('../firebase', () => ({
  rtdb: {},
}));

describe('livePositions.service', () => {
  const mockRef = jest.fn();
  const mockSet = set as jest.MockedFunction<typeof set>;
  const mockRemove = remove as jest.MockedFunction<typeof remove>;
  const mockOnValue = onValue as jest.MockedFunction<typeof onValue>;
  const mockOnDisconnect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (ref as jest.MockedFunction<typeof ref>).mockReturnValue(mockRef as any);
    (onDisconnect as jest.MockedFunction<typeof onDisconnect>).mockReturnValue({
      remove: mockOnDisconnect,
      cancel: jest.fn(),
    } as any);
  });

  describe('setLivePosition', () => {
    it('should write live position to RTDB with correct structure', async () => {
      const shapeId = 'shape123';
      const userId = 'user456';
      const x = 100;
      const y = 200;
      const width = 150;
      const height = 100;

      await setLivePosition(shapeId, userId, x, y, width, height);

      // Verify ref uses correct canvas ID
      expect(ref).toHaveBeenCalledWith(rtdb, `livePositions/default-canvas/${shapeId}`);

      // Verify set is called with correct data structure
      expect(mockSet).toHaveBeenCalled();
      const setCall = mockSet.mock.calls[0];
      const positionData = setCall[1] as any;

      expect(positionData.userId).toBe(userId);
      expect(positionData.x).toBe(x);
      expect(positionData.y).toBe(y);
      expect(positionData.width).toBe(width);
      expect(positionData.height).toBe(height);
      expect(positionData.lastUpdate).toBeDefined();
      expect(typeof positionData.lastUpdate).toBe('number');
    });

    it('should configure onDisconnect hook for automatic cleanup', async () => {
      const shapeId = 'shape123';
      const userId = 'user456';

      await setLivePosition(shapeId, userId, 10, 20, 100, 100);

      expect(onDisconnect).toHaveBeenCalledWith(mockRef);
      expect(mockOnDisconnect).toHaveBeenCalled();
    });

    it('should not throw on failure (non-critical feature)', async () => {
      mockSet.mockRejectedValue(new Error('Network error'));

      await expect(
        setLivePosition('shape1', 'user1', 0, 0, 100, 100)
      ).resolves.not.toThrow();
    });
  });

  describe('clearLivePosition', () => {
    it('should remove live position from RTDB', async () => {
      const shapeId = 'shape123';

      await clearLivePosition(shapeId);

      expect(ref).toHaveBeenCalledWith(rtdb, `livePositions/default-canvas/${shapeId}`);
      expect(mockRemove).toHaveBeenCalledWith(mockRef);
    });

    it('should cancel onDisconnect hook', async () => {
      const cancelMock = jest.fn();
      (onDisconnect as jest.MockedFunction<typeof onDisconnect>).mockReturnValue({
        remove: jest.fn(),
        cancel: cancelMock,
      } as any);

      await clearLivePosition('shape123');

      expect(cancelMock).toHaveBeenCalled();
    });

    it('should not throw on failure', async () => {
      mockRemove.mockRejectedValue(new Error('Network error'));

      await expect(clearLivePosition('shape1')).resolves.not.toThrow();
    });
  });

  describe('subscribeToLivePositions', () => {
    it('should set up RTDB listener with correct path', () => {
      const mockCallback = jest.fn();

      subscribeToLivePositions(mockCallback);

      // Verify ref uses correct canvas ID
      expect(ref).toHaveBeenCalledWith(rtdb, 'livePositions/default-canvas');

      // Verify onValue is called to set up listener
      expect(mockOnValue).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should call callback with live position data', () => {
      const mockCallback = jest.fn();
      const mockLivePositions = {
        shape1: {
          userId: 'user1',
          x: 10,
          y: 20,
          width: 100,
          height: 80,
          lastUpdate: Date.now(),
        },
        shape2: {
          userId: 'user2',
          x: 50,
          y: 60,
          width: 120,
          height: 90,
          lastUpdate: Date.now(),
        },
      };

      mockOnValue.mockImplementation((ref, callback) => {
        callback({ val: () => mockLivePositions } as any);
        return jest.fn();
      });

      subscribeToLivePositions(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(mockLivePositions);
    });

    it('should return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockOnValue.mockReturnValue(mockUnsubscribe);

      const unsubscribe = subscribeToLivePositions(jest.fn());

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle empty live position data', () => {
      const mockCallback = jest.fn();

      mockOnValue.mockImplementation((ref, callback) => {
        callback({ val: () => null } as any);
        return jest.fn();
      });

      subscribeToLivePositions(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({});
    });

    it('should handle errors gracefully', () => {
      const mockCallback = jest.fn();

      mockOnValue.mockImplementation((ref, successCallback, errorCallback) => {
        errorCallback(new Error('RTDB error'));
        return jest.fn();
      });

      subscribeToLivePositions(mockCallback);

      // Should call callback with empty object on error
      expect(mockCallback).toHaveBeenCalledWith({});
    });
  });

  describe('Live position data structure', () => {
    it('should be ephemeral (RTDB only, not Firestore)', async () => {
      // This is more of a documentation test
      // Live positions use RTDB which is ephemeral
      const shapeId = 'shape123';
      const userId = 'user456';

      await setLivePosition(shapeId, userId, 10, 20, 100, 100);

      // Verify we're using RTDB (rtdb variable, not firestore)
      expect(ref).toHaveBeenCalledWith(rtdb, expect.stringContaining('livePositions'));
    });
  });
});

