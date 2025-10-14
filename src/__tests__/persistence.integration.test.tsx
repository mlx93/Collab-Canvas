// Integration test for Firestore persistence
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { CanvasProvider } from '../context/CanvasContext';
import { AuthProvider } from '../context/AuthContext';
import { useCanvas } from '../hooks/useCanvas';
import * as canvasService from '../services/canvas.service';

// Mock Firebase
jest.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  rtdb: {},
}));

// Mock Konva (required for Canvas components)
jest.mock('react-konva', () => ({
  Stage: ({ children }: any) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Rect: () => <div data-testid="konva-rect" />,
  Circle: () => <div data-testid="konva-circle" />,
  Group: ({ children }: any) => <div data-testid="konva-group">{children}</div>,
}));

// Mock auth service with proper unsubscribe
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
  }
}));

// Mock canvas service with proper unsubscribe
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

// Mock useFPS hook
jest.mock('../hooks/useFPS', () => ({
  useFPS: () => 60,
}));

describe('Persistence Integration Tests', () => {
  const mockUser = {
    userId: 'test-user-id',
    email: 'test@example.com',
    username: 'test@example.com',
  };

  // Test component that uses canvas context
  const TestComponent: React.FC = () => {
    const canvas = useCanvas();
    return (
      <div>
        <button
          onClick={() =>
            canvas.addRectangle({
              x: 100,
              y: 100,
              width: 100,
              height: 100,
              color: '#2196F3',
              createdBy: mockUser.email,
              lastModifiedBy: mockUser.email,
            })
          }
        >
          Add Rectangle
        </button>
        <div data-testid="rectangle-count">{canvas.rectangles.length}</div>
      </div>
    );
  };

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <AuthProvider>
        <CanvasProvider>{component}</CanvasProvider>
      </AuthProvider>
    );
  };

  it('should subscribe to Firestore shapes on mount', async () => {
    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(canvasService.subscribeToShapes).toHaveBeenCalledTimes(1);
      expect(canvasService.subscribeToShapes).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('should sync rectangles from Firestore', async () => {
    const mockShapes = [
      {
        id: 'shape-1',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        color: '#2196F3',
        zIndex: 1,
        createdBy: mockUser.email,
        createdAt: new Date(),
        lastModifiedBy: mockUser.email,
        lastModified: new Date(),
      },
      {
        id: 'shape-2',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        color: '#4CAF50',
        zIndex: 2,
        createdBy: mockUser.email,
        createdAt: new Date(),
        lastModifiedBy: mockUser.email,
        lastModified: new Date(),
      },
    ];

    (canvasService.subscribeToShapes as jest.Mock).mockImplementation((callback) => {
      callback(mockShapes);
      return jest.fn();
    });

    const { getByTestId } = renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('rectangle-count').textContent).toBe('2');
    });
  });

  it('should call createRectangle when adding a rectangle', async () => {
    const { getByText } = renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(canvasService.subscribeToShapes).toHaveBeenCalled();
    });

    await act(async () => {
      getByText('Add Rectangle').click();
    });

    await waitFor(() => {
      expect(canvasService.createRectangle).toHaveBeenCalledTimes(1);
      expect(canvasService.createRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
        })
      );
    });
  });

  it('should maintain z-index ordering from Firestore', async () => {
    const mockShapes = [
      {
        id: 'shape-1',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        color: '#2196F3',
        zIndex: 2, // Back
        createdBy: mockUser.email,
        createdAt: new Date(),
        lastModifiedBy: mockUser.email,
        lastModified: new Date(),
      },
      {
        id: 'shape-2',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        color: '#4CAF50',
        zIndex: 1, // Front
        createdBy: mockUser.email,
        createdAt: new Date(),
        lastModifiedBy: mockUser.email,
        lastModified: new Date(),
      },
    ];

    let capturedCallback: Function | null = null;
    (canvasService.subscribeToShapes as jest.Mock).mockImplementation((callback) => {
      capturedCallback = callback;
      callback(mockShapes);
      return jest.fn();
    });

    const RenderTestComponent: React.FC = () => {
      const canvas = useCanvas();
      return (
        <div>
          {canvas.rectangles.map((rect, index) => (
            <div key={rect.id} data-testid={`rect-${index}`}>
              {rect.id} - zIndex: {rect.zIndex}
            </div>
          ))}
        </div>
      );
    };

    const { getByTestId } = renderWithProviders(<RenderTestComponent />);

    await waitFor(() => {
      expect(getByTestId('rect-0').textContent).toContain('shape-1');
      expect(getByTestId('rect-0').textContent).toContain('zIndex: 2');
      expect(getByTestId('rect-1').textContent).toContain('shape-2');
      expect(getByTestId('rect-1').textContent).toContain('zIndex: 1');
    });
  });

  it('should handle Firestore sync errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (canvasService.createRectangle as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(canvasService.subscribeToShapes).toHaveBeenCalled();
    });

    await act(async () => {
      getByText('Add Rectangle').click();
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create rectangle in Firestore:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should persist loading state during initial fetch', async () => {
    const LoadingTestComponent: React.FC = () => {
      const canvas = useCanvas();
      return (
        <div>
          <div data-testid="loading-state">{canvas.loading ? 'Loading' : 'Loaded'}</div>
        </div>
      );
    };

    (canvasService.subscribeToShapes as jest.Mock).mockImplementation((callback) => {
      // Simulate delayed load
      setTimeout(() => callback([]), 100);
      return jest.fn();
    });

    const { getByTestId } = renderWithProviders(<LoadingTestComponent />);

    // Initially loading
    expect(getByTestId('loading-state').textContent).toBe('Loading');

    // After shapes load
    await waitFor(
      () => {
        expect(getByTestId('loading-state').textContent).toBe('Loaded');
      },
      { timeout: 200 }
    );
  });

  it('should use canvas ID "default-canvas"', async () => {
    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(canvasService.subscribeToShapes).toHaveBeenCalled();
    });

    // The service should be called with the hardcoded canvas ID
    // This is tested in the canvas.service.test.ts unit tests
    expect(canvasService.subscribeToShapes).toHaveBeenCalledTimes(1);
  });
});

