// Unit tests for activeEdits service
import {
  setActiveEdit,
  clearActiveEdit,
  subscribeToActiveEdit,
  subscribeToAllActiveEdits,
  getUserCursorColor,
  EditAction,
  ActiveEdit,
} from '../activeEdits.service';
import { ref, set, remove, onValue, onDisconnect } from 'firebase/database';

// Mock Firebase RTDB
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  onValue: jest.fn(),
  onDisconnect: jest.fn(),
}));

jest.mock('../firebase', () => ({
  rtdb: {},
}));

describe('activeEdits.service', () => {
  const mockShapeId = 'shape-123';
  const mockUserId = 'user-456';
  const mockEmail = 'user@example.com';
  const mockCursorColor = '#FF6B6B';
  const mockAction: EditAction = 'moving';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to suppress error logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setActiveEdit', () => {
    it('should set active edit in RTDB with correct structure', async () => {
      const mockRef = { path: 'activeEdits/default-canvas/shape-123' };
      const mockOnDisconnectRef = { remove: jest.fn().mockResolvedValue(undefined) };
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);
      (onDisconnect as jest.Mock).mockReturnValue(mockOnDisconnectRef);

      await setActiveEdit(mockShapeId, mockUserId, mockEmail, mockAction, mockCursorColor);

      // Verify ref was created correctly
      expect(ref).toHaveBeenCalledWith({}, 'activeEdits/default-canvas/shape-123');

      // Verify data structure
      expect(set).toHaveBeenCalledWith(mockRef, {
        userId: mockUserId,
        email: mockEmail,
        action: mockAction,
        cursorColor: mockCursorColor,
        startedAt: expect.any(Number),
      });

      // Verify onDisconnect was configured
      expect(onDisconnect).toHaveBeenCalledWith(mockRef);
      expect(mockOnDisconnectRef.remove).toHaveBeenCalled();
    });

    it('should handle all action types', async () => {
      const mockRef = { path: 'activeEdits/default-canvas/shape-123' };
      const mockOnDisconnectRef = { remove: jest.fn().mockResolvedValue(undefined) };
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);
      (onDisconnect as jest.Mock).mockReturnValue(mockOnDisconnectRef);

      const actions: EditAction[] = ['moving', 'resizing', 'recoloring'];

      for (const action of actions) {
        await setActiveEdit(mockShapeId, mockUserId, mockEmail, action, mockCursorColor);
        
        expect(set).toHaveBeenCalledWith(mockRef, expect.objectContaining({
          action,
        }));
      }
    });

    it('should not throw on error (non-critical feature)', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (set as jest.Mock).mockRejectedValue(new Error('RTDB error'));
      (onDisconnect as jest.Mock).mockReturnValue({ remove: jest.fn() });

      await expect(
        setActiveEdit(mockShapeId, mockUserId, mockEmail, mockAction, mockCursorColor)
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith('Failed to set active edit:', expect.any(Error));
    });
  });

  describe('clearActiveEdit', () => {
    it('should remove active edit from RTDB', async () => {
      const mockRef = { path: 'activeEdits/default-canvas/shape-123' };
      const mockOnDisconnectRef = { cancel: jest.fn().mockResolvedValue(undefined) };
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (remove as jest.Mock).mockResolvedValue(undefined);
      (onDisconnect as jest.Mock).mockReturnValue(mockOnDisconnectRef);

      await clearActiveEdit(mockShapeId);

      // Verify ref was created correctly
      expect(ref).toHaveBeenCalledWith({}, 'activeEdits/default-canvas/shape-123');

      // Verify remove was called
      expect(remove).toHaveBeenCalledWith(mockRef);

      // Verify onDisconnect was cancelled
      expect(onDisconnect).toHaveBeenCalledWith(mockRef);
      expect(mockOnDisconnectRef.cancel).toHaveBeenCalled();
    });

    it('should not throw on error (non-critical feature)', async () => {
      (ref as jest.Mock).mockReturnValue({});
      (remove as jest.Mock).mockRejectedValue(new Error('RTDB error'));
      (onDisconnect as jest.Mock).mockReturnValue({ cancel: jest.fn() });

      await expect(clearActiveEdit(mockShapeId)).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith('Failed to clear active edit:', expect.any(Error));
    });
  });

  describe('subscribeToActiveEdit', () => {
    it('should subscribe to active edit for a specific shape', () => {
      const mockRef = { path: 'activeEdits/default-canvas/shape-123' };
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (onValue as jest.Mock).mockImplementation((ref, callback) => {
        // Simulate RTDB update with active edit data
        const mockSnapshot = {
          val: () => ({
            userId: mockUserId,
            email: mockEmail,
            action: mockAction,
            cursorColor: mockCursorColor,
            startedAt: Date.now(),
          } as ActiveEdit),
        };
        callback(mockSnapshot);
        return mockUnsubscribe;
      });

      const unsubscribe = subscribeToActiveEdit(mockShapeId, mockCallback);

      // Verify ref was created correctly
      expect(ref).toHaveBeenCalledWith({}, 'activeEdits/default-canvas/shape-123');

      // Verify onValue was called
      expect(onValue).toHaveBeenCalledWith(mockRef, expect.any(Function), expect.any(Function));

      // Verify callback was called with active edit data
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUserId,
        email: mockEmail,
        action: mockAction,
        cursorColor: mockCursorColor,
      }));

      // Verify unsubscribe function is returned
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should call callback with null when no active edit', () => {
      const mockRef = { path: 'activeEdits/default-canvas/shape-123' };
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (onValue as jest.Mock).mockImplementation((ref, callback) => {
        // Simulate empty snapshot
        const mockSnapshot = {
          val: () => null,
        };
        callback(mockSnapshot);
        return mockUnsubscribe;
      });

      subscribeToActiveEdit(mockShapeId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null);
    });

    it('should handle errors gracefully', () => {
      const mockRef = { path: 'activeEdits/default-canvas/shape-123' };
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (onValue as jest.Mock).mockImplementation((ref, callback, errorCallback) => {
        // Simulate error
        errorCallback(new Error('RTDB error'));
        return mockUnsubscribe;
      });

      subscribeToActiveEdit(mockShapeId, mockCallback);

      expect(console.error).toHaveBeenCalledWith('Error subscribing to active edit:', expect.any(Error));
      expect(mockCallback).toHaveBeenCalledWith(null);
    });
  });

  describe('subscribeToAllActiveEdits', () => {
    it('should subscribe to all active edits for the canvas', () => {
      const mockRef = { path: 'activeEdits/default-canvas' };
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      const mockActiveEdits = {
        'shape-1': {
          userId: 'user-1',
          email: 'user1@example.com',
          action: 'moving' as EditAction,
          cursorColor: '#FF6B6B',
          startedAt: Date.now(),
        },
        'shape-2': {
          userId: 'user-2',
          email: 'user2@example.com',
          action: 'resizing' as EditAction,
          cursorColor: '#4ECDC4',
          startedAt: Date.now(),
        },
      };
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (onValue as jest.Mock).mockImplementation((ref, callback) => {
        // Simulate RTDB update with multiple active edits
        const mockSnapshot = {
          val: () => mockActiveEdits,
        };
        callback(mockSnapshot);
        return mockUnsubscribe;
      });

      const unsubscribe = subscribeToAllActiveEdits(mockCallback);

      // Verify ref was created correctly
      expect(ref).toHaveBeenCalledWith({}, 'activeEdits/default-canvas');

      // Verify callback was called with all active edits
      expect(mockCallback).toHaveBeenCalledWith(mockActiveEdits);

      // Verify unsubscribe function is returned
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should call callback with empty object when no active edits', () => {
      const mockRef = { path: 'activeEdits/default-canvas' };
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (onValue as jest.Mock).mockImplementation((ref, callback) => {
        // Simulate empty snapshot
        const mockSnapshot = {
          val: () => null,
        };
        callback(mockSnapshot);
        return mockUnsubscribe;
      });

      subscribeToAllActiveEdits(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({});
    });

    it('should handle errors gracefully', () => {
      const mockRef = { path: 'activeEdits/default-canvas' };
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      (ref as jest.Mock).mockReturnValue(mockRef);
      (onValue as jest.Mock).mockImplementation((ref, callback, errorCallback) => {
        // Simulate error
        errorCallback(new Error('RTDB error'));
        return mockUnsubscribe;
      });

      subscribeToAllActiveEdits(mockCallback);

      expect(console.error).toHaveBeenCalledWith('Error subscribing to all active edits:', expect.any(Error));
      expect(mockCallback).toHaveBeenCalledWith({});
    });
  });

  describe('getUserCursorColor', () => {
    it('should return consistent color for same email', () => {
      const color1 = getUserCursorColor('test@example.com');
      const color2 = getUserCursorColor('test@example.com');
      
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return different colors for different emails', () => {
      const color1 = getUserCursorColor('user1@example.com');
      const color2 = getUserCursorColor('user2@example.com');
      const color3 = getUserCursorColor('user3@example.com');
      
      // Note: This test might occasionally fail if emails hash to same index
      // But it's statistically unlikely with 10 colors
      const colors = [color1, color2, color3];
      const uniqueColors = new Set(colors);
      
      // At least 2 colors should be different (statistically very likely)
      expect(uniqueColors.size).toBeGreaterThan(1);
    });

    it('should return a color from the predefined palette', () => {
      const predefinedColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
      ];
      
      const color = getUserCursorColor('test@example.com');
      
      expect(predefinedColors).toContain(color);
    });
  });
});

