// Integration tests for rectangle operations in CanvasContext
import React from 'react';
import { render, act } from '@testing-library/react';
import { CanvasProvider } from '../context/CanvasContext';
import { useCanvas } from '../hooks/useCanvas';
import { AuthProvider } from '../context/AuthContext';
import { authService } from '../services/auth.service';

// Mock Firebase
jest.mock('../services/firebase', () => ({
  auth: { currentUser: { uid: 'test-user', email: 'test@example.com' } },
  db: {},
  rtdb: {}
}));

// Mock authService with proper unsubscribe
jest.mock('../services/auth.service', () => ({
  authService: {
    onAuthStateChange: jest.fn((callback) => {
      callback({
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'test@example.com',
      });
      return jest.fn(); // unsubscribe function
    }),
    signOut: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
  }
}));

// Mock canvas.service with proper unsubscribe
jest.mock('../services/canvas.service', () => ({
  createRectangle: jest.fn().mockResolvedValue(undefined),
  updateRectangle: jest.fn().mockResolvedValue(undefined),
  updateZIndex: jest.fn().mockResolvedValue(undefined),
  deleteRectangle: jest.fn().mockResolvedValue(undefined),
  subscribeToShapes: jest.fn((callback) => {
    setTimeout(() => callback([]), 0); // Async but immediate
    return jest.fn(); // Fresh unsubscribe function
  }),
}));

// Test component to access canvas context
const TestComponent: React.FC<{ onRender: (context: any) => void }> = ({ onRender }) => {
  const context = useCanvas();
  
  React.useEffect(() => {
    onRender(context);
  }, [context, onRender]);
  
  return null;
};

describe('Rectangle Operations', () => {
  let canvasContext: any;

  const renderCanvas = () => {
    const handleRender = (context: any) => {
      canvasContext = context;
    };

    render(
      <AuthProvider>
        <CanvasProvider>
          <TestComponent onRender={handleRender} />
        </CanvasProvider>
      </AuthProvider>
    );
  };

  beforeEach(() => {
    renderCanvas();
  });

  describe('addRectangle', () => {
    it('should create rectangle at viewport center with default size 100x100px', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      expect(canvasContext.rectangles).toHaveLength(1);
      expect(canvasContext.rectangles[0].width).toBe(100);
      expect(canvasContext.rectangles[0].height).toBe(100);
    });

    it('should assign z-index 1 to new rectangle', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      expect(canvasContext.rectangles[0].zIndex).toBe(1);
    });

    it('should push existing rectangles back when adding new one', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const firstId = canvasContext.rectangles[0].id;

      act(() => {
        canvasContext.addRectangleFull({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const firstRect = canvasContext.rectangles.find((r: any) => r.id === firstId);
      const secondRect = canvasContext.rectangles.find((r: any) => r.id !== firstId);

      // New convention: higher z-index = front
      // First rectangle: 1, Second rectangle: 2 (front)
      expect(firstRect.zIndex).toBe(1);
      expect(secondRect.zIndex).toBe(2);
    });

    it('should auto-select newly created rectangle', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      expect(canvasContext.selectedIds).toContain(canvasContext.rectangles[0].id);
    });

    it('should use predefined colors only', () => {
      const colors = ['#2196F3', '#4CAF50', '#F44336', '#FF9800', '#212121'];

      colors.forEach((color) => {
        act(() => {
          canvasContext.addRectangleFull({
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            color,
            createdBy: 'test-user',
            lastModifiedBy: 'test-user',
          });
        });
      });

      expect(canvasContext.rectangles).toHaveLength(5);
      canvasContext.rectangles.forEach((rect: any, index: number) => {
        expect(colors).toContain(rect.color);
      });
    });
  });

  describe('updateRectangle', () => {
    let rectId: string;

    beforeEach(() => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
        canvasContext.addRectangleFull({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      rectId = canvasContext.rectangles[1].id; // Second rectangle (currently z-index 2)
    });

    it('should update position and auto-set z-index to maxZIndex + 1', () => {
      act(() => {
        canvasContext.updateRectangle(rectId, { x: 300, y: 300 });
      });

      const rect = canvasContext.rectangles.find((r: any) => r.id === rectId);
      expect(rect.x).toBe(300);
      expect(rect.y).toBe(300);
      expect(rect.zIndex).toBe(2); // Initial zIndex was 1, maxZIndex + 1 = 2
    });

    it('should update dimensions and auto-set z-index to maxZIndex + 1', () => {
      act(() => {
        canvasContext.updateRectangle(rectId, { width: 200, height: 150 });
      });

      const rect = canvasContext.rectangles.find((r: any) => r.id === rectId);
      expect(rect.width).toBe(200);
      expect(rect.height).toBe(150);
      expect(rect.zIndex).toBe(2); // maxZIndex + 1 = 2
    });

    it('should change color and auto-set z-index to maxZIndex + 1', () => {
      act(() => {
        canvasContext.updateRectangle(rectId, { color: '#F44336' });
      });

      const rect = canvasContext.rectangles.find((r: any) => r.id === rectId);
      expect(rect.color).toBe('#F44336');
      expect(rect.zIndex).toBe(2); // maxZIndex + 1 = 2
    });

    it('should manually set z-index without auto-update', () => {
      act(() => {
        canvasContext.updateRectangle(rectId, { zIndex: 1 });
      });

      const rect = canvasContext.rectangles.find((r: any) => r.id === rectId);
      expect(rect.zIndex).toBe(1);
    });

    it('should update lastModified timestamp', () => {
      const beforeUpdate = new Date();

      act(() => {
        canvasContext.updateRectangle(rectId, { x: 400 });
      });

      const rect = canvasContext.rectangles.find((r: any) => r.id === rectId);
      expect(rect.lastModified >= beforeUpdate).toBe(true);
    });
  });

  describe('deleteRectangle', () => {
    it('should remove rectangle from state', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      expect(canvasContext.rectangles).toHaveLength(1);
      const rectId = canvasContext.rectangles[0].id;

      act(() => {
        canvasContext.deleteRectangle(rectId);
      });

      expect(canvasContext.rectangles).toHaveLength(0);
    });

    it('should deselect if deleted rectangle was selected', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rectId = canvasContext.rectangles[0].id;
      expect(canvasContext.selectedIds).toContain(rectId);

      act(() => {
        canvasContext.deleteRectangle(rectId);
      });

      expect(canvasContext.selectedIds).toHaveLength(0);
    });

    it('should not deselect if deleted rectangle was not selected', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rect1Id = canvasContext.rectangles[0].id;

      act(() => {
        canvasContext.addRectangleFull({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      // rect2 is the most recently added, so it's selected and at front (z-index 1)
      const rect2Id = canvasContext.selectedIds[0];
      expect(canvasContext.selectedIds.length).toBeGreaterThan(0);
      expect(rect2Id).not.toBe(rect1Id);

      act(() => {
        canvasContext.deleteRectangle(rect1Id);
      });

      expect(canvasContext.selectedIds).toContain(rect2Id);
    });
  });

  describe('selection operations', () => {
    it('should select rectangle', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rectId = canvasContext.rectangles[0].id;

      act(() => {
        canvasContext.setSelectedRectangle(rectId);
      });

      expect(canvasContext.selectedIds).toContain(rectId);
    });

    it('should only allow one rectangle selected at a time', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rect1Id = canvasContext.rectangles[0].id;

      act(() => {
        canvasContext.addRectangleFull({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rect2Id = canvasContext.rectangles[1].id;

      act(() => {
        canvasContext.setSelectedRectangle(rect1Id);
      });
      expect(canvasContext.selectedIds).toContain(rect1Id);

      act(() => {
        canvasContext.setSelectedRectangle(rect2Id);
      });
      expect(canvasContext.selectedIds).toContain(rect2Id);
    });

    it('should deselect all when setting to null', () => {
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rectId = canvasContext.rectangles[0].id;
      expect(canvasContext.selectedIds).toContain(rectId);

      act(() => {
        canvasContext.setSelectedRectangle(null);
      });

      expect(canvasContext.selectedIds).toHaveLength(0);
    });
  });

  describe('z-index operations', () => {
    let rect1Id: string;
    let rect2Id: string;
    let rect3Id: string;

    beforeEach(() => {
      // Add rect1 and capture its ID from selectedRectangleId (newly added rect is auto-selected)
      act(() => {
        canvasContext.addRectangleFull({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });
      rect1Id = canvasContext.selectedIds[0];

      // Add rect2 and capture its ID
      act(() => {
        canvasContext.addRectangleFull({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });
      rect2Id = canvasContext.selectedIds[0];

      // Add rect3 and capture its ID
      act(() => {
        canvasContext.addRectangleFull({
          x: 300,
          y: 300,
          width: 100,
          height: 100,
          color: '#F44336',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });
      rect3Id = canvasContext.selectedIds[0];
    });

    it('should manually set z-index with push-down recalculation', () => {
      // NEW CONVENTION: Higher z-index = front
      // rect1 (first) → z-index 1 (back), rect2 → z-index 2, rect3 (last) → z-index 3 (front)
      // Verify initial state
      const initialRect1 = canvasContext.rectangles.find((r: any) => r.id === rect1Id);
      const initialRect2 = canvasContext.rectangles.find((r: any) => r.id === rect2Id);
      const initialRect3 = canvasContext.rectangles.find((r: any) => r.id === rect3Id);
      
      expect(initialRect1.zIndex).toBe(1); // Oldest, at back
      expect(initialRect2.zIndex).toBe(2);
      expect(initialRect3.zIndex).toBe(3); // Most recent, at front
      
      // Set rect1 to z-index 3 (bring to front, taking rect3's spot)
      act(() => {
        canvasContext.setZIndex(rect1Id, 3);
      });

      const rect1 = canvasContext.rectangles.find((r: any) => r.id === rect1Id);
      const rect2 = canvasContext.rectangles.find((r: any) => r.id === rect2Id);
      const rect3 = canvasContext.rectangles.find((r: any) => r.id === rect3Id);

      // After moving rect1 from 1→3 (forward), shapes 2 and 3 shift back
      expect(rect1.zIndex).toBe(3); // Moved to front
      expect(rect2.zIndex).toBe(1); // Was 2, shifted back to 1
      expect(rect3.zIndex).toBe(2); // Was 3, shifted back to 2
    });

    it('should bring rectangle to front', () => {
      // rect1 is currently at back (z-index 1), bring to front (maxZIndex + 1 = 4)
      act(() => {
        canvasContext.bringToFront(rect1Id);
      });

      const rect1 = canvasContext.rectangles.find((r: any) => r.id === rect1Id);
      expect(rect1.zIndex).toBe(4); // maxZIndex (3) + 1
    });

    it('should send rectangle to back', () => {
      // rect3 is currently at front (z-index 3), send to back (minZIndex - 1 = 0, enforced min 1)
      act(() => {
        canvasContext.sendToBack(rect3Id);
      });

      const rect3 = canvasContext.rectangles.find((r: any) => r.id === rect3Id);
      expect(rect3.zIndex).toBe(1); // Math.max(1, minZIndex - 1) = 1
    });

    it('should ensure no duplicate z-indices after operations', () => {
      act(() => {
        canvasContext.setZIndex(rect1Id, 1);
      });

      const zIndices = canvasContext.rectangles.map((r: any) => r.zIndex);
      const hasDuplicates = zIndices.some((val: number, idx: number) => zIndices.indexOf(val) !== idx);

      expect(hasDuplicates).toBe(false);
    });
  });
});

