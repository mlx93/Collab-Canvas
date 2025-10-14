// Unit tests for useCanvas hook
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useCanvas } from '../useCanvas';
import { CanvasProvider } from '../../context/CanvasContext';
import { AuthProvider } from '../../context/AuthContext';

// Mock Firebase
jest.mock('../../services/firebase', () => ({
  auth: { currentUser: { uid: 'test-user', email: 'test@example.com' } },
  db: {},
  rtdb: {}
}));

// Mock authService
jest.mock('../../services/auth.service', () => ({
  authService: {
    onAuthStateChange: jest.fn((callback) => {
      callback({ uid: 'test-user', email: 'test@example.com' });
      return jest.fn();
    }),
    signOut: jest.fn(),
  }
}));

describe('useCanvas hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <CanvasProvider>{children}</CanvasProvider>
    </AuthProvider>
  );

  it('should initialize with default viewport state', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    expect(result.current.viewport).toEqual({
      x: 0,
      y: 0,
      scale: 1
    });
  });

  it('should initialize with empty rectangles array', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    expect(result.current.rectangles).toEqual([]);
  });

  describe('Viewport operations', () => {
    it('should update viewport with setViewport', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.setViewport({ x: 100, y: 200, scale: 1.5 });
      });

      expect(result.current.viewport).toEqual({
        x: 100,
        y: 200,
        scale: 1.5
      });
    });

    it('should pan viewport with panViewport', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.panViewport(50, 75);
      });

      expect(result.current.viewport).toEqual({
        x: 50,
        y: 75,
        scale: 1
      });
    });

    it('should accumulate pan deltas', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.panViewport(50, 75);
      });
      
      act(() => {
        result.current.panViewport(25, 25);
      });

      expect(result.current.viewport).toEqual({
        x: 75,
        y: 100,
        scale: 1
      });
    });

    it('should zoom viewport with zoomViewport', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.zoomViewport(0.5);
      });

      expect(result.current.viewport.scale).toBe(1.5);
    });

    it('should respect minimum zoom limit', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.zoomViewport(-1); // Attempt to go below 0.1
      });

      expect(result.current.viewport.scale).toBeGreaterThanOrEqual(0.1);
    });

    it('should respect maximum zoom limit', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.zoomViewport(10); // Attempt to go above 8
      });

      expect(result.current.viewport.scale).toBeLessThanOrEqual(8);
    });
  });

  describe('Rectangle operations', () => {
    it('should add rectangle with generated id and zIndex', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      expect(result.current.rectangles).toHaveLength(1);
      expect(result.current.rectangles[0]).toHaveProperty('id');
      expect(result.current.rectangles[0]).toHaveProperty('zIndex', 1);
    });

    it('should add new rectangles to front (zIndex = 1)', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const firstId = result.current.rectangles[0].id;

      act(() => {
        result.current.addRectangle({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const firstRect = result.current.rectangles.find(r => r.id === firstId);
      const secondRect = result.current.rectangles.find(r => r.id !== firstId);

      expect(firstRect?.zIndex).toBe(2);
      expect(secondRect?.zIndex).toBe(1);
    });

    it('should update rectangle properties', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rectId = result.current.rectangles[0].id;

      act(() => {
        result.current.updateRectangle(rectId, { x: 200, y: 300 });
      });

      const updatedRect = result.current.rectangles.find(r => r.id === rectId);
      expect(updatedRect?.x).toBe(200);
      expect(updatedRect?.y).toBe(300);
    });

    it('should delete rectangle', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rectId = result.current.rectangles[0].id;

      act(() => {
        result.current.deleteRectangle(rectId);
      });

      expect(result.current.rectangles).toHaveLength(0);
    });

    it('should set selected rectangle', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rectId = result.current.rectangles[0].id;

      act(() => {
        result.current.setSelectedRectangle(rectId);
      });

      expect(result.current.selectedRectangleId).toBe(rectId);
    });
  });

  describe('Z-index operations', () => {
    it('should bring rectangle to front', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      // Add 3 rectangles
      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rect1Id = result.current.selectedRectangleId!;

      act(() => {
        result.current.addRectangle({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      act(() => {
        result.current.addRectangle({
          x: 300,
          y: 300,
          width: 100,
          height: 100,
          color: '#F44336',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      // Bring first rectangle (now at back) to front
      act(() => {
        result.current.bringToFront(rect1Id);
      });

      const rect1 = result.current.rectangles.find(r => r.id === rect1Id);
      expect(rect1?.zIndex).toBe(1);
    });

    it('should send rectangle to back', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      // Add 3 rectangles
      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      act(() => {
        result.current.addRectangle({
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          color: '#4CAF50',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      act(() => {
        result.current.addRectangle({
          x: 300,
          y: 300,
          width: 100,
          height: 100,
          color: '#F44336',
          createdBy: 'test-user',
          lastModifiedBy: 'test-user',
        });
      });

      const rect3Id = result.current.selectedRectangleId!;

      // Send last rectangle (now at front) to back
      act(() => {
        result.current.sendToBack(rect3Id);
      });

      const rect3 = result.current.rectangles.find(r => r.id === rect3Id);
      expect(rect3?.zIndex).toBe(3);
    });
  });

  describe('Tool operations', () => {
    it('should set current tool', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      expect(result.current.currentTool).toBe('select');

      act(() => {
        result.current.setTool('rectangle');
      });

      expect(result.current.currentTool).toBe('rectangle');
    });
  });
});

