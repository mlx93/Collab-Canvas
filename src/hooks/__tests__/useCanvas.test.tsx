// Unit tests for useCanvas hook
import { renderHook, act } from '@testing-library/react';
import { useCanvas } from '../useCanvas';
import { CanvasProvider } from '../../context/CanvasContext';
import { MIN_ZOOM, MAX_ZOOM } from '../../utils/constants';

describe('useCanvas hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CanvasProvider>{children}</CanvasProvider>
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

  it('should throw error when used outside CanvasProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCanvas());
    }).toThrow('useCanvas must be used within a CanvasProvider');

    consoleSpy.mockRestore();
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
        result.current.panViewport(25, 30);
      });

      expect(result.current.viewport).toEqual({
        x: 75,
        y: 105,
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
        result.current.zoomViewport(-10); // Try to zoom way out
      });

      expect(result.current.viewport.scale).toBe(MIN_ZOOM);
    });

    it('should respect maximum zoom limit', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.zoomViewport(10); // Try to zoom way in
      });

      expect(result.current.viewport.scale).toBe(MAX_ZOOM);
    });
  });

  describe('Rectangle operations', () => {
    it('should add rectangle with generated id and zIndex', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          color: '#FF0000',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      expect(result.current.rectangles).toHaveLength(1);
      expect(result.current.rectangles[0]).toMatchObject({
        x: 100,
        y: 200,
        width: 150,
        height: 100,
        color: '#FF0000',
        zIndex: 1
      });
      expect(result.current.rectangles[0].id).toBeDefined();
      expect(result.current.rectangles[0].createdAt).toBeInstanceOf(Date);
    });

    it('should add new rectangles to front (zIndex = 1)', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      act(() => {
        result.current.addRectangle({
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          color: '#FF0000',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
        result.current.addRectangle({
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          color: '#00FF00',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      expect(result.current.rectangles[0].zIndex).toBe(2); // First rect pushed back
      expect(result.current.rectangles[1].zIndex).toBe(1); // New rect at front
    });

    it('should update rectangle properties', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      let rectId: string;

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          color: '#FF0000',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      rectId = result.current.rectangles[0].id;

      act(() => {
        result.current.updateRectangle(rectId, {
          x: 300,
          y: 400,
          color: '#0000FF'
        });
      });

      expect(result.current.rectangles[0]).toMatchObject({
        x: 300,
        y: 400,
        width: 150,
        height: 100,
        color: '#0000FF'
      });
    });

    it('should delete rectangle', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      let rectId: string;

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          color: '#FF0000',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      rectId = result.current.rectangles[0].id;

      act(() => {
        result.current.deleteRectangle(rectId);
      });

      expect(result.current.rectangles).toHaveLength(0);
    });

    it('should set selected rectangle', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      let rectId: string;

      act(() => {
        result.current.addRectangle({
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          color: '#FF0000',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      rectId = result.current.rectangles[0].id;

      act(() => {
        result.current.setSelectedRectangle(rectId);
      });

      expect(result.current.selectedRectangleId).toBe(rectId);
    });
  });

  describe('Z-index operations', () => {
    it('should bring rectangle to front', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      let rect1Id: string;
      let rect2Id: string;

      act(() => {
        result.current.addRectangle({
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          color: '#FF0000',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      rect1Id = result.current.rectangles[0].id;

      act(() => {
        result.current.addRectangle({
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          color: '#00FF00',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      rect2Id = result.current.rectangles[1].id;

      // rect1 is at zIndex 2, rect2 is at zIndex 1
      expect(result.current.rectangles.find(r => r.id === rect1Id)?.zIndex).toBe(2);
      expect(result.current.rectangles.find(r => r.id === rect2Id)?.zIndex).toBe(1);

      act(() => {
        result.current.bringToFront(rect1Id);
      });

      // Now rect1 should be at zIndex 1, rect2 at zIndex 2
      expect(result.current.rectangles.find(r => r.id === rect1Id)?.zIndex).toBe(1);
      expect(result.current.rectangles.find(r => r.id === rect2Id)?.zIndex).toBe(2);
    });

    it('should send rectangle to back', () => {
      const { result } = renderHook(() => useCanvas(), { wrapper });

      let rect1Id: string;
      let rect2Id: string;

      act(() => {
        result.current.addRectangle({
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          color: '#FF0000',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      rect1Id = result.current.rectangles[0].id;

      act(() => {
        result.current.addRectangle({
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          color: '#00FF00',
          createdBy: 'user1',
          lastModifiedBy: 'user1'
        });
      });

      rect2Id = result.current.rectangles[1].id;

      // rect2 is at zIndex 1 (front)
      expect(result.current.rectangles.find(r => r.id === rect2Id)?.zIndex).toBe(1);

      act(() => {
        result.current.sendToBack(rect2Id);
      });

      // Now rect2 should be at zIndex 3 (back)
      expect(result.current.rectangles.find(r => r.id === rect2Id)?.zIndex).toBe(3);
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

