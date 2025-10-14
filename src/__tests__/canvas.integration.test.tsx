// Integration test for canvas interactions (pan, zoom, FPS)
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { CanvasProvider } from '../context/CanvasContext';
import { useCanvas } from '../hooks/useCanvas';
import { Canvas } from '../components/Canvas/Canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_BACKGROUND, MIN_ZOOM, MAX_ZOOM } from '../utils/constants';

// Mock Konva
jest.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => (
    <div data-testid="konva-stage" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: any) => <div data-testid="konva-rect" data-props={JSON.stringify(props)} />
}));

// Mock useFPS hook
jest.mock('../hooks/useFPS', () => ({
  useFPS: () => 60
}));

describe('Canvas Interactions Integration', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CanvasProvider>{children}</CanvasProvider>
  );

  it('should render canvas with correct dimensions', () => {
    render(
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    );

    const rect = screen.getAllByTestId('konva-rect')[0];
    const props = JSON.parse(rect.getAttribute('data-props') || '{}');

    expect(props.width).toBe(CANVAS_WIDTH);
    expect(props.height).toBe(CANVAS_HEIGHT);
  });

  it('should render canvas with off-white background', () => {
    render(
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    );

    const rect = screen.getAllByTestId('konva-rect')[0];
    const props = JSON.parse(rect.getAttribute('data-props') || '{}');

    expect(props.fill).toBe(CANVAS_BACKGROUND);
  });

  it('should initialize viewport at origin with scale 1', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    expect(result.current.viewport).toEqual({
      x: 0,
      y: 0,
      scale: 1
    });
  });

  it('should update viewport on pan', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    act(() => {
      result.current.panViewport(100, 50);
    });

    expect(result.current.viewport).toEqual({
      x: 100,
      y: 50,
      scale: 1
    });
  });

  it('should update viewport on zoom', () => {
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

  it('should display FPS counter in development mode', () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    );

    // FPS counter should be visible
    expect(screen.getByText('FPS:')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should hide FPS counter in production mode', () => {
    // Set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    );

    // FPS counter should not be visible
    expect(screen.queryByText('FPS:')).not.toBeInTheDocument();

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should display zoom percentage indicator', () => {
    render(
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    );

    // Default zoom is 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should update zoom indicator when viewport changes', async () => {
    const TestComponent = () => {
      const { zoomViewport } = useCanvas();
      
      return (
        <div>
          <button onClick={() => zoomViewport(0.5)}>Zoom In</button>
          <Canvas />
        </div>
      );
    };

    const { getByText } = render(
      <CanvasProvider>
        <TestComponent />
      </CanvasProvider>
    );

    // Click zoom button
    act(() => {
      getByText('Zoom In').click();
    });

    // Wait for zoom indicator to update to 150%
    await waitFor(() => {
      expect(screen.getByText('150%')).toBeInTheDocument();
    });
  });

  it('should allow multiple users to have independent viewports', () => {
    // Simulate two users with separate contexts
    const { result: user1 } = renderHook(() => useCanvas(), { wrapper });
    const { result: user2 } = renderHook(() => useCanvas(), { wrapper });

    // User 1 pans
    act(() => {
      user1.current.panViewport(100, 100);
    });

    // User 2 zooms
    act(() => {
      user2.current.zoomViewport(0.5);
    });

    // Each user should have their own viewport state
    expect(user1.current.viewport).toEqual({
      x: 100,
      y: 100,
      scale: 1
    });

    expect(user2.current.viewport).toEqual({
      x: 0,
      y: 0,
      scale: 1.5
    });
  });

  it('should maintain canvas state through viewport changes', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    // Add a rectangle
    act(() => {
      result.current.addRectangle({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        color: '#FF0000',
        createdBy: 'user1',
        lastModifiedBy: 'user1'
      });
    });

    expect(result.current.rectangles).toHaveLength(1);

    // Pan and zoom
    act(() => {
      result.current.panViewport(50, 75);
      result.current.zoomViewport(0.5);
    });

    // Rectangles should still be there
    expect(result.current.rectangles).toHaveLength(1);
    expect(result.current.rectangles[0].x).toBe(100);
    expect(result.current.rectangles[0].y).toBe(100);
  });

  it('should render Stage with correct initial props', () => {
    render(
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    );

    const stage = screen.getByTestId('konva-stage');
    const props = JSON.parse(stage.getAttribute('data-props') || '{}');

    expect(props.x).toBe(0);
    expect(props.y).toBe(0);
    expect(props.scaleX).toBe(1);
    expect(props.scaleY).toBe(1);
    // Note: draggable is handled via mouse event handlers, not as a prop
  });

  it('should have canvas background with correct properties', () => {
    render(
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    );

    const rects = screen.getAllByTestId('konva-rect');
    const backgroundRect = rects[0];
    const props = JSON.parse(backgroundRect.getAttribute('data-props') || '{}');

    expect(props.x).toBe(0);
    expect(props.y).toBe(0);
    expect(props.width).toBe(CANVAS_WIDTH);
    expect(props.height).toBe(CANVAS_HEIGHT);
    expect(props.fill).toBe(CANVAS_BACKGROUND);
    expect(props.listening).toBe(false);
  });
});

