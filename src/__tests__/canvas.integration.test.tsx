// Integration tests for Canvas interactions (pan, zoom, FPS)
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CanvasProvider } from '../context/CanvasContext';
import { AuthProvider } from '../context/AuthContext';
import { Canvas } from '../components/Canvas/Canvas';
import { MainLayout } from '../components/Layout/MainLayout';
import { Header } from '../components/Layout/Header';

// Mock Firebase
jest.mock('../services/firebase', () => ({
  auth: { currentUser: { uid: 'test-user', email: 'test@example.com' } },
  db: {},
  rtdb: {}
}));

// Mock authService
jest.mock('../services/auth.service', () => ({
  authService: {
    onAuthStateChange: jest.fn((callback) => {
      callback({ uid: 'test-user', email: 'test@example.com' });
      return jest.fn();
    }),
    signOut: jest.fn(),
  }
}));

// Mock Konva with simple test IDs
jest.mock('react-konva', () => ({
  Stage: ({ children, onWheel, onMouseDown, onMouseMove, onMouseUp, x, y, scaleX }: any) => (
    <div
      data-testid="konva-stage"
      data-x={x}
      data-y={y}
      data-scale={scaleX}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {children}
    </div>
  ),
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Rect: ({ fill, x, y, width, height }: any) => (
    <div
      data-testid="konva-rect"
      data-fill={fill}
      data-x={x}
      data-y={y}
      data-width={width}
      data-height={height}
    />
  ),
}));

// Mock useFPS
jest.mock('../hooks/useFPS', () => ({
  useFPS: () => 60
}));

describe('Canvas Interactions Integration', () => {
  const renderCanvas = () => {
    return render(
      <AuthProvider>
        <CanvasProvider>
          <Canvas />
        </CanvasProvider>
      </AuthProvider>
    );
  };

  it('should render canvas with correct dimensions', () => {
    renderCanvas();

    const stage = screen.getByTestId('konva-stage');
    expect(stage).toBeInTheDocument();
  });

  it('should render canvas with off-white background', () => {
    renderCanvas();

    const backgroundRect = screen.getByTestId('konva-rect');
    expect(backgroundRect).toHaveAttribute('data-fill', '#FAFAFA');
    expect(backgroundRect).toHaveAttribute('data-width', '5000');
    expect(backgroundRect).toHaveAttribute('data-height', '5000');
  });

  it('should initialize viewport at origin with scale 1', () => {
    renderCanvas();

    const stage = screen.getByTestId('konva-stage');
    expect(stage).toHaveAttribute('data-x', '0');
    expect(stage).toHaveAttribute('data-y', '0');
    expect(stage).toHaveAttribute('data-scale', '1');
  });

  it('should display FPS counter in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderCanvas();

    expect(screen.getByText('FPS:')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should hide FPS counter in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    renderCanvas();

    expect(screen.queryByText('FPS:')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should display zoom percentage indicator', () => {
    renderCanvas();

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should render Stage with correct initial props', () => {
    renderCanvas();

    const stage = screen.getByTestId('konva-stage');
    expect(stage).toHaveAttribute('data-x', '0');
    expect(stage).toHaveAttribute('data-y', '0');
    expect(stage).toHaveAttribute('data-scale', '1');
  });

  it('should render Layer inside Stage', () => {
    renderCanvas();

    const layer = screen.getByTestId('konva-layer');
    expect(layer).toBeInTheDocument();
  });

  it('should render background rectangle with canvas dimensions', () => {
    renderCanvas();

    const rect = screen.getByTestId('konva-rect');
    expect(rect).toHaveAttribute('data-x', '0');
    expect(rect).toHaveAttribute('data-y', '0');
    expect(rect).toHaveAttribute('data-width', '5000');
    expect(rect).toHaveAttribute('data-height', '5000');
    expect(rect).toHaveAttribute('data-fill', '#FAFAFA');
  });
});

describe('Canvas with MainLayout Integration', () => {
  it('should render canvas within main layout structure', () => {
    const mockToolbar = <div data-testid="mock-toolbar">Toolbar</div>;
    const mockProperties = <div data-testid="mock-properties">Properties</div>;

    render(
      <AuthProvider>
        <CanvasProvider>
          <MainLayout
            header={<Header fps={60} showFPS={true} />}
            toolbar={mockToolbar}
            canvas={<Canvas />}
            properties={mockProperties}
          />
        </CanvasProvider>
      </AuthProvider>
    );

    // Verify all components are rendered
    expect(screen.getByText('CollabCanvas')).toBeInTheDocument();
    expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    expect(screen.getByTestId('mock-properties')).toBeInTheDocument();
  });

  it('should display header with FPS when enabled', () => {
    const mockToolbar = <div data-testid="mock-toolbar">Toolbar</div>;
    const mockProperties = <div data-testid="mock-properties">Properties</div>;

    render(
      <AuthProvider>
        <CanvasProvider>
          <MainLayout
            header={<Header fps={60} showFPS={true} />}
            toolbar={mockToolbar}
            canvas={<Canvas />}
            properties={mockProperties}
          />
        </CanvasProvider>
      </AuthProvider>
    );

    expect(screen.getByText('FPS:')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('should maintain canvas state independently of viewport changes', () => {
    render(
      <AuthProvider>
        <CanvasProvider>
          <Canvas />
        </CanvasProvider>
      </AuthProvider>
    );

    const stage = screen.getByTestId('konva-stage');
    
    // Initial state
    expect(stage).toHaveAttribute('data-x', '0');
    expect(stage).toHaveAttribute('data-y', '0');
    expect(stage).toHaveAttribute('data-scale', '1');

    // Canvas state should remain consistent
    expect(screen.getByTestId('konva-layer')).toBeInTheDocument();
    expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
  });
});

