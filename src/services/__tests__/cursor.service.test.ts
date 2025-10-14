/**
 * Unit tests for cursor.service.ts
 * Tests RTDB cursor tracking with color names and hex codes
 */
import {
  updateCursorPosition,
  removeCursor,
  subscribeToCursors,
  getUserCursorColor,
} from '../cursor.service';
import { ref, set, remove, onValue, onDisconnect } from 'firebase/database';
import { rtdb } from '../firebase';

// Mock Firebase RTDB
jest.mock('firebase/database');
jest.mock('../firebase', () => ({
  rtdb: {},
}));

describe('cursor.service', () => {
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

  describe('getUserCursorColor', () => {
    it('should return consistent color for same email', () => {
      const email = 'test@example.com';
      const result1 = getUserCursorColor(email);
      const result2 = getUserCursorColor(email);

      expect(result1).toEqual(result2);
      expect(result1.colorName).toBeDefined();
      expect(result1.cursorColor).toBeDefined();
      expect(result1.cursorColor).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
    });

    it('should return color name (not email)', () => {
      const email = 'user@example.com';
      const result = getUserCursorColor(email);

      expect(result.colorName).not.toContain('@');
      expect(result.colorName).not.toContain('user');
      expect(typeof result.colorName).toBe('string');
      expect(result.colorName.length).toBeGreaterThan(0);
    });

    it('should return hex color code', () => {
      const email = 'user@example.com';
      const result = getUserCursorColor(email);

      expect(result.cursorColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(result.cursorColor.length).toBe(7); // # + 6 hex digits
    });

    it('should produce diverse colors for different emails', () => {
      const colors = new Set();
      const testEmails = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
        'user4@example.com',
        'user5@example.com',
      ];

      testEmails.forEach((email) => {
        const result = getUserCursorColor(email);
        colors.add(result.cursorColor);
      });

      // At least some diversity (not all the same)
      expect(colors.size).toBeGreaterThan(1);
    });
  });

  describe('updateCursorPosition', () => {
    it('should update cursor position in RTDB with correct structure', async () => {
      const userId = 'user123';
      const email = 'test@example.com';
      const x = 100;
      const y = 200;

      // Capture the actual data passed to set()
      let capturedData: any;
      mockSet.mockImplementation((ref, data) => {
        capturedData = data;
        return Promise.resolve();
      });

      await updateCursorPosition(userId, email, x, y);

      // Verify ref is called with correct path (canvas ID: default-canvas)
      expect(ref).toHaveBeenCalledWith(rtdb, `cursors/default-canvas/${userId}`);

      // Verify set is called
      expect(mockSet).toHaveBeenCalled();

      // Verify cursor data structure
      expect(capturedData).toBeDefined();
      expect(capturedData.x).toBe(x);
      expect(capturedData.y).toBe(y);
      expect(capturedData.userId).toBe(userId);
      expect(capturedData.colorName).toBeDefined();
      expect(capturedData.colorName).not.toContain('@'); // Color name, not email
      expect(capturedData.cursorColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(capturedData.lastUpdate).toBeDefined();
      expect(typeof capturedData.lastUpdate).toBe('number');
    });

    it('should configure onDisconnect hook', async () => {
      const userId = 'user123';
      const email = 'test@example.com';
      const x = 100;
      const y = 200;

      await updateCursorPosition(userId, email, x, y);

      expect(onDisconnect).toHaveBeenCalledWith(mockRef);
      expect(mockOnDisconnect).toHaveBeenCalled();
    });
  });

  describe('removeCursor', () => {
    it('should remove cursor from RTDB', async () => {
      const userId = 'user123';

      await removeCursor(userId);

      expect(ref).toHaveBeenCalledWith(rtdb, `cursors/default-canvas/${userId}`);
      expect(mockRemove).toHaveBeenCalledWith(mockRef);
    });
  });

  describe('subscribeToCursors', () => {
    it('should set up RTDB listener with correct path', () => {
      const mockCallback = jest.fn();

      subscribeToCursors(mockCallback);

      // Verify ref uses correct canvas ID
      expect(ref).toHaveBeenCalledWith(rtdb, 'cursors/default-canvas');

      // Verify onValue is called to set up listener
      expect(mockOnValue).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should call callback with cursor data', () => {
      const mockCallback = jest.fn();
      const mockCursorData = {
        user1: { x: 10, y: 20, userId: 'user1', colorName: 'Blue', cursorColor: '#0000FF', lastUpdate: Date.now() },
        user2: { x: 30, y: 40, userId: 'user2', colorName: 'Red', cursorColor: '#FF0000', lastUpdate: Date.now() },
      };

      mockOnValue.mockImplementation((ref, callback) => {
        callback({ val: () => mockCursorData } as any);
        return jest.fn();
      });

      subscribeToCursors(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(mockCursorData);
    });

    it('should return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockOnValue.mockReturnValue(mockUnsubscribe);

      const unsubscribe = subscribeToCursors(jest.fn());

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle empty cursor data', () => {
      const mockCallback = jest.fn();

      mockOnValue.mockImplementation((ref, callback) => {
        callback({ val: () => null } as any);
        return jest.fn();
      });

      subscribeToCursors(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({});
    });
  });
});

