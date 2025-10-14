/**
 * Unit tests for selection.service.ts
 * Tests ephemeral selection state (RTDB only)
 */
import {
  setSelection,
  clearSelection,
  subscribeToSelections,
} from '../selection.service';
import { ref, set, remove, onValue, onDisconnect } from 'firebase/database';
import { rtdb } from '../firebase';

// Mock Firebase RTDB
jest.mock('firebase/database');
jest.mock('../firebase', () => ({
  rtdb: {},
}));

describe('selection.service', () => {
  const mockRef = jest.fn();
  const mockSet = set as jest.MockedFunction<typeof set>;
  const mockRemove = remove as jest.MockedFunction<typeof remove>;
  const mockOnValue = onValue as jest.MockedFunction<typeof onValue>;
  const mockOnDisconnect = jest.fn();
  const mockOnDisconnectCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (ref as jest.MockedFunction<typeof ref>).mockReturnValue(mockRef as any);
    (onDisconnect as jest.MockedFunction<typeof onDisconnect>).mockReturnValue({
      remove: mockOnDisconnect,
      cancel: mockOnDisconnectCancel,
    } as any);
  });

  describe('setSelection', () => {
    it('should write selection to RTDB with correct structure', async () => {
      const userId = 'user123';
      const shapeId = 'shape456';

      // Capture the actual data passed to set()
      let capturedData: any;
      mockSet.mockImplementation((ref, data) => {
        capturedData = data;
        return Promise.resolve();
      });

      await setSelection(userId, shapeId);

      // Verify ref uses correct canvas ID
      expect(ref).toHaveBeenCalledWith(rtdb, `selections/default-canvas/${userId}`);

      // Verify set is called
      expect(mockSet).toHaveBeenCalled();

      // Verify selection data structure
      expect(capturedData).toBeDefined();
      expect(capturedData.userId).toBe(userId);
      expect(capturedData.selectedShapeId).toBe(shapeId);
      expect(capturedData.selectedAt).toBeDefined();
      expect(typeof capturedData.selectedAt).toBe('number');
    });

    it('should configure onDisconnect hook for automatic cleanup', async () => {
      const userId = 'user123';
      const shapeId = 'shape456';

      await setSelection(userId, shapeId);

      expect(onDisconnect).toHaveBeenCalledWith(mockRef);
      expect(mockOnDisconnect).toHaveBeenCalled();
    });

    it('should not throw on failure', async () => {
      mockSet.mockRejectedValue(new Error('Network error'));

      await expect(setSelection('user1', 'shape1')).resolves.not.toThrow();
    });
  });

  describe('clearSelection', () => {
    it('should remove selection from RTDB', async () => {
      const userId = 'user123';

      await clearSelection(userId);

      expect(ref).toHaveBeenCalledWith(rtdb, `selections/default-canvas/${userId}`);
      expect(mockRemove).toHaveBeenCalledWith(mockRef);
    });

    it('should cancel onDisconnect hook', async () => {
      const userId = 'user123';

      await clearSelection(userId);

      expect(mockOnDisconnectCancel).toHaveBeenCalled();
    });

    it('should not throw on failure', async () => {
      mockRemove.mockRejectedValue(new Error('Network error'));

      await expect(clearSelection('user1')).resolves.not.toThrow();
    });
  });

  describe('subscribeToSelections', () => {
    it('should set up RTDB listener with correct path', () => {
      const mockCallback = jest.fn();

      subscribeToSelections(mockCallback);

      // Verify ref uses correct canvas ID
      expect(ref).toHaveBeenCalledWith(rtdb, 'selections/default-canvas');

      // Verify onValue is called to set up listener
      expect(mockOnValue).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should call callback with selection data', () => {
      const mockCallback = jest.fn();
      const mockSelections = {
        user1: {
          userId: 'user1',
          selectedShapeId: 'shape1',
          selectedAt: Date.now(),
        },
        user2: {
          userId: 'user2',
          selectedShapeId: 'shape2',
          selectedAt: Date.now(),
        },
      };

      mockOnValue.mockImplementation((ref, callback) => {
        callback({ val: () => mockSelections } as any);
        return jest.fn();
      });

      subscribeToSelections(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(mockSelections);
    });

    it('should return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockOnValue.mockReturnValue(mockUnsubscribe);

      const unsubscribe = subscribeToSelections(jest.fn());

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle empty selection data', () => {
      const mockCallback = jest.fn();

      mockOnValue.mockImplementation((ref, callback) => {
        callback({ val: () => null } as any);
        return jest.fn();
      });

      subscribeToSelections(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({});
    });

    it('should handle errors gracefully', () => {
      const mockCallback = jest.fn();

      mockOnValue.mockImplementation((ref, successCallback, errorCallback) => {
        errorCallback(new Error('RTDB error'));
        return jest.fn();
      });

      subscribeToSelections(mockCallback);

      // Should call callback with empty object on error
      expect(mockCallback).toHaveBeenCalledWith({});
    });
  });

  describe('Selection state is ephemeral', () => {
    it('should use RTDB (not Firestore) for ephemeral state', async () => {
      // This is a documentation/architecture test
      // Selections use RTDB which is ephemeral (doesn't persist across refreshes)
      const userId = 'user123';
      const shapeId = 'shape456';

      await setSelection(userId, shapeId);

      // Verify we're using RTDB (rtdb variable, not firestore)
      expect(ref).toHaveBeenCalledWith(rtdb, expect.stringContaining('selections'));
    });

    it('should auto-clear on disconnect via onDisconnect hook', async () => {
      const userId = 'user123';
      const shapeId = 'shape456';

      await setSelection(userId, shapeId);

      // Verify onDisconnect is configured to remove the selection
      expect(onDisconnect).toHaveBeenCalled();
      expect(mockOnDisconnect).toHaveBeenCalled();
    });
  });
});

