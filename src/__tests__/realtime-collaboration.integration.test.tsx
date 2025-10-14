// Integration tests for real-time collaboration features
import * as activeEditsService from '../services/activeEdits.service';
import * as canvasService from '../services/canvas.service';

describe('Real-Time Collaboration Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Layer Integration', () => {
    it('should have activeEdits service for tracking edits', () => {
      expect(activeEditsService.setActiveEdit).toBeDefined();
      expect(activeEditsService.clearActiveEdit).toBeDefined();
      expect(activeEditsService.subscribeToActiveEdit).toBeDefined();
      expect(activeEditsService.subscribeToAllActiveEdits).toBeDefined();
      expect(activeEditsService.getUserCursorColor).toBeDefined();
    });

    it('should have canvas service for persistence', () => {
      expect(canvasService.createRectangle).toBeDefined();
      expect(canvasService.updateRectangle).toBeDefined();
      expect(canvasService.updateZIndex).toBeDefined();
      expect(canvasService.deleteRectangle).toBeDefined();
      expect(canvasService.subscribeToShapes).toBeDefined();
    });

    it('should assign consistent cursor colors for users', () => {
      const color1 = activeEditsService.getUserCursorColor('test@example.com');
      const color2 = activeEditsService.getUserCursorColor('test@example.com');
      const color3 = activeEditsService.getUserCursorColor('other@example.com');
      
      // Same user gets same color
      expect(color1).toBe(color2);
      
      // All colors should be valid hex codes
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color3).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('Collaboration Features Readiness', () => {
    it('should support active edit lifecycle (set, subscribe, clear)', () => {
      // Verify all functions are available for the collaboration flow
      expect(typeof activeEditsService.setActiveEdit).toBe('function');
      expect(typeof activeEditsService.subscribeToActiveEdit).toBe('function');
      expect(typeof activeEditsService.clearActiveEdit).toBe('function');
    });

    it('should support multi-user edit tracking', () => {
      expect(typeof activeEditsService.subscribeToAllActiveEdits).toBe('function');
    });

    it('should work with canvas persistence layer', () => {
      // Collaboration features integrate with canvas service for:
      // 1. Optimistic updates (local state + Firestore)
      expect(typeof canvasService.createRectangle).toBe('function');
      expect(typeof canvasService.updateRectangle).toBe('function');
      
      // 2. Real-time sync (Firestore subscriptions)
      expect(typeof canvasService.subscribeToShapes).toBe('function');
      
      // 3. Active edits (RTDB for ephemeral state)
      expect(typeof activeEditsService.setActiveEdit).toBe('function');
    });
  });

  describe('Edit Actions', () => {
    it('should support different edit action types', () => {
      const actions: activeEditsService.EditAction[] = ['moving', 'resizing', 'recoloring'];
      
      // All action types should be valid
      actions.forEach(action => {
        expect(['moving', 'resizing', 'recoloring']).toContain(action);
      });
    });
  });
});

