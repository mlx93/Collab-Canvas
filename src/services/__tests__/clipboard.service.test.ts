// Clipboard service tests
import { clipboardService } from '../clipboard.service';
import { RectangleShape, CircleShape } from '../../types/canvas.types';

describe('ClipboardService', () => {
  beforeEach(() => {
    // Clear clipboard before each test
    clipboardService.clearClipboard();
  });

  describe('copyShapes', () => {
    it('should copy shapes with removed IDs', () => {
      const shapes: RectangleShape[] = [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          color: '#FF0000',
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        },
        {
          id: 'rect2',
          type: 'rectangle',
          x: 200,
          y: 200,
          width: 75,
          height: 75,
          color: '#00FF00',
          rotation: 0,
          opacity: 1,
          zIndex: 2,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        }
      ];

      clipboardService.copyShapes(shapes);
      
      expect(clipboardService.hasClipboard()).toBe(true);
      const clipboard = clipboardService.getClipboard();
      expect(clipboard).toHaveLength(2);
      expect(clipboard[0].id).toBeUndefined();
      expect(clipboard[1].id).toBeUndefined();
      expect(clipboard[0].x).toBe(100);
      expect(clipboard[1].x).toBe(200);
    });

    it('should handle empty array', () => {
      clipboardService.copyShapes([]);
      expect(clipboardService.hasClipboard()).toBe(false);
    });
  });

  describe('pasteShapes', () => {
    it('should paste shapes at cursor position with new IDs', () => {
      const shapes: RectangleShape[] = [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          color: '#FF0000',
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        }
      ];

      clipboardService.copyShapes(shapes);
      const pasted = clipboardService.pasteShapes(200, 200);

      expect(pasted).toHaveLength(1);
      expect(pasted[0].id).toMatch(/^temp-/);
      expect(pasted[0].x).toBe(200); // Should be at cursor position
      expect(pasted[0].y).toBe(200); // Should be at cursor position
      expect(pasted[0].zIndex).toBe(0); // Will be set by context
      expect(pasted[0].createdBy).toBe(''); // Will be set by context
    });

    it('should use default offset when none provided', () => {
      const shapes: CircleShape[] = [
        {
          id: 'circle1',
          type: 'circle',
          x: 50,
          y: 50,
          radius: 25,
          color: '#0000FF',
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        }
      ];

      clipboardService.copyShapes(shapes);
      const pasted = clipboardService.pasteShapes();

      expect(pasted).toHaveLength(1);
      expect(pasted[0].x).toBe(70); // 50 + 20 (default)
      expect(pasted[0].y).toBe(70); // 50 + 20 (default)
    });

    it('should paste multiple shapes maintaining relative positions', () => {
      const shapes: RectangleShape[] = [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          color: '#FF0000',
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        },
        {
          id: 'rect2',
          type: 'rectangle',
          x: 200,
          y: 150,
          width: 50,
          height: 50,
          color: '#00FF00',
          rotation: 0,
          opacity: 1,
          zIndex: 2,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        }
      ];

      clipboardService.copyShapes(shapes);
      const pasted = clipboardService.pasteShapes(300, 300);

      expect(pasted).toHaveLength(2);
      
      // Original center was at (150, 125), so shapes should be positioned relative to cursor (300, 300)
      // First shape: was at (100, 100), offset from center (-50, -25), so new position (250, 275)
      expect(pasted[0].x).toBe(250);
      expect(pasted[0].y).toBe(275);
      
      // Second shape: was at (200, 150), offset from center (50, 25), so new position (350, 325)
      expect(pasted[1].x).toBe(350);
      expect(pasted[1].y).toBe(325);
    });

    it('should return empty array when clipboard is empty', () => {
      const pasted = clipboardService.pasteShapes();
      expect(pasted).toHaveLength(0);
    });
  });

  describe('clearClipboard', () => {
    it('should clear clipboard', () => {
      const shapes: RectangleShape[] = [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          color: '#FF0000',
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        }
      ];

      clipboardService.copyShapes(shapes);
      expect(clipboardService.hasClipboard()).toBe(true);

      clipboardService.clearClipboard();
      expect(clipboardService.hasClipboard()).toBe(false);
    });
  });

  describe('hasClipboard', () => {
    it('should return false when clipboard is empty', () => {
      expect(clipboardService.hasClipboard()).toBe(false);
    });

    it('should return true when clipboard has shapes', () => {
      const shapes: RectangleShape[] = [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          color: '#FF0000',
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          createdBy: 'user1@example.com',
          createdAt: new Date(),
          lastModifiedBy: 'user1@example.com',
          lastModified: new Date()
        }
      ];

      clipboardService.copyShapes(shapes);
      expect(clipboardService.hasClipboard()).toBe(true);
    });
  });
});
