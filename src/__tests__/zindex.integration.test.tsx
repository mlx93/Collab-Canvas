// Integration tests for z-index system with UI components
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CanvasProvider } from '../context/CanvasContext';
import { useCanvas } from '../hooks/useCanvas';
import { AuthProvider } from '../context/AuthContext';

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

// Test component to access canvas context and display z-indices
const ZIndexTestComponent: React.FC = () => {
  const { rectangles, addRectangle, updateRectangle, setZIndex, bringToFront } = useCanvas();

  return (
    <div>
      <button
        data-testid="add-rect-btn"
        onClick={() => {
          addRectangle({
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            color: '#2196F3',
            createdBy: 'test-user',
            lastModifiedBy: 'test-user',
          });
        }}
      >
        Add Rectangle
      </button>
      
      <div data-testid="rectangles-container">
        {rectangles.map((rect) => (
          <div key={rect.id} data-testid={`rect-${rect.id}`} data-zindex={rect.zIndex}>
            <span>Z-Index: {rect.zIndex}</span>
            <button
              data-testid={`update-${rect.id}`}
              onClick={() => updateRectangle(rect.id, { x: rect.x + 10 })}
            >
              Move
            </button>
            <button
              data-testid={`set-zindex-${rect.id}`}
              onClick={() => setZIndex(rect.id, 2)}
            >
              Set Z-Index 2
            </button>
            <button
              data-testid={`bring-front-${rect.id}`}
              onClick={() => bringToFront(rect.id)}
            >
              Bring to Front
            </button>
          </div>
        ))}
      </div>
      
      <div data-testid="rect-count">{rectangles.length}</div>
    </div>
  );
};

describe('Z-Index Integration Tests', () => {
  const renderComponent = () => {
    return render(
      <AuthProvider>
        <CanvasProvider>
          <ZIndexTestComponent />
        </CanvasProvider>
      </AuthProvider>
    );
  };

  it('should create 3 rectangles with last created at z-index 1 (front)', () => {
    renderComponent();

    const addBtn = screen.getByTestId('add-rect-btn');

    // Add 3 rectangles
    act(() => {
      addBtn.click();
    });
    act(() => {
      addBtn.click();
    });
    act(() => {
      addBtn.click();
    });

    expect(screen.getByTestId('rect-count')).toHaveTextContent('3');

    // Get all rectangles
    const container = screen.getByTestId('rectangles-container');
    const rects = container.querySelectorAll('[data-testid^="rect-"]');

    // Check z-indices: last added should be 1, second should be 2, first should be 3
    const zIndices = Array.from(rects).map(rect => parseInt(rect.getAttribute('data-zindex') || '0'));
    
    // The most recently added rectangle should have z-index 1
    expect(zIndices).toContain(1);
    expect(zIndices).toContain(2);
    expect(zIndices).toContain(3);
    
    // All z-indices should be unique
    const uniqueZIndices = new Set(zIndices);
    expect(uniqueZIndices.size).toBe(3);
  });

  it('should move rectangle to front (z-index 1) when updated', () => {
    renderComponent();

    const addBtn = screen.getByTestId('add-rect-btn');

    // Add 3 rectangles
    act(() => {
      addBtn.click();
      addBtn.click();
      addBtn.click();
    });

    const container = screen.getByTestId('rectangles-container');
    const rects = container.querySelectorAll('[data-testid^="rect-"]');
    
    // Find a rectangle that is NOT at front (z-index > 1)
    let targetRect: Element | null = null;
    let targetRectId = '';
    let initialZIndex = 0;

    for (const rect of Array.from(rects)) {
      const zIndex = parseInt(rect.getAttribute('data-zindex') || '0');
      if (zIndex > 1) {
        targetRect = rect;
        targetRectId = rect.getAttribute('data-testid')?.replace('rect-', '') || '';
        initialZIndex = zIndex;
        break;
      }
    }

    expect(targetRect).not.toBeNull();
    expect(initialZIndex).toBeGreaterThan(1); // Should be at back

    // Update it (move it)
    const moveBtn = screen.getByTestId(`update-${targetRectId}`);
    act(() => {
      moveBtn.click();
    });

    // After update, it should move to front (z-index 1)
    const updatedRect = screen.getByTestId(`rect-${targetRectId}`);
    expect(updatedRect).toHaveAttribute('data-zindex', '1');
  });

  it('should manually set z-index via setZIndex with push-down recalculation', () => {
    renderComponent();

    const addBtn = screen.getByTestId('add-rect-btn');

    // Add 3 rectangles
    act(() => {
      addBtn.click();
      addBtn.click();
      addBtn.click();
    });

    const container = screen.getByTestId('rectangles-container');
    const rects = container.querySelectorAll('[data-testid^="rect-"]');
    
    // Get the first rectangle (z-index 3)
    const firstRect = rects[0];
    const firstRectId = firstRect.getAttribute('data-testid')?.replace('rect-', '') || '';
    
    // Manually set it to z-index 2
    const setZIndexBtn = screen.getByTestId(`set-zindex-${firstRectId}`);
    act(() => {
      setZIndexBtn.click();
    });

    // Verify z-index changed
    const updatedRect = screen.getByTestId(`rect-${firstRectId}`);
    expect(updatedRect).toHaveAttribute('data-zindex', '2');

    // Verify no duplicate z-indices
    const allRects = container.querySelectorAll('[data-testid^="rect-"]');
    const zIndices = Array.from(allRects).map(rect => parseInt(rect.getAttribute('data-zindex') || '0'));
    const uniqueZIndices = new Set(zIndices);
    expect(uniqueZIndices.size).toBe(3); // All unique
  });

  it('should verify no duplicate z-indices with multiple rectangles', () => {
    renderComponent();

    const addBtn = screen.getByTestId('add-rect-btn');

    // Add 10 rectangles
    act(() => {
      for (let i = 0; i < 10; i++) {
        addBtn.click();
      }
    });

    expect(screen.getByTestId('rect-count')).toHaveTextContent('10');

    const container = screen.getByTestId('rectangles-container');
    const rects = container.querySelectorAll('[data-testid^="rect-"]');
    const zIndices = Array.from(rects).map(rect => parseInt(rect.getAttribute('data-zindex') || '0'));

    // Check for duplicates
    const uniqueZIndices = new Set(zIndices);
    expect(uniqueZIndices.size).toBe(10); // All unique

    // Check range (should be 1-10)
    expect(Math.min(...zIndices)).toBe(1);
    expect(Math.max(...zIndices)).toBe(10);
  });

  it('should bring rectangle to front using bringToFront', () => {
    renderComponent();

    const addBtn = screen.getByTestId('add-rect-btn');

    // Add 3 rectangles
    act(() => {
      addBtn.click();
      addBtn.click();
      addBtn.click();
    });

    const container = screen.getByTestId('rectangles-container');
    const rects = container.querySelectorAll('[data-testid^="rect-"]');
    
    // Find a rectangle that is NOT at front (z-index > 1)
    let targetRect: Element | null = null;
    let targetRectId = '';
    let initialZIndex = 0;

    for (const rect of Array.from(rects)) {
      const zIndex = parseInt(rect.getAttribute('data-zindex') || '0');
      if (zIndex > 1) {
        targetRect = rect;
        targetRectId = rect.getAttribute('data-testid')?.replace('rect-', '') || '';
        initialZIndex = zIndex;
        break;
      }
    }

    expect(targetRect).not.toBeNull();
    expect(initialZIndex).toBeGreaterThan(1); // Should be at back

    // Bring to front
    const bringFrontBtn = screen.getByTestId(`bring-front-${targetRectId}`);
    act(() => {
      bringFrontBtn.click();
    });

    // Should now be at front (z-index 1)
    const updatedRect = screen.getByTestId(`rect-${targetRectId}`);
    expect(updatedRect).toHaveAttribute('data-zindex', '1');
  });

  it('should maintain z-ordering after multiple operations', () => {
    renderComponent();

    const addBtn = screen.getByTestId('add-rect-btn');

    // Add 4 rectangles
    act(() => {
      addBtn.click();
      addBtn.click();
      addBtn.click();
      addBtn.click();
    });

    const container = screen.getByTestId('rectangles-container');
    let rects = container.querySelectorAll('[data-testid^="rect-"]');
    
    const rect1Id = rects[0].getAttribute('data-testid')?.replace('rect-', '') || '';
    const rect2Id = rects[1].getAttribute('data-testid')?.replace('rect-', '') || '';

    // Perform multiple operations
    act(() => {
      // Move rect1 (should go to front)
      screen.getByTestId(`update-${rect1Id}`).click();
    });

    act(() => {
      // Bring rect2 to front
      screen.getByTestId(`bring-front-${rect2Id}`).click();
    });

    // Verify no duplicate z-indices after all operations
    rects = container.querySelectorAll('[data-testid^="rect-"]');
    const zIndices = Array.from(rects).map(rect => parseInt(rect.getAttribute('data-zindex') || '0'));
    const uniqueZIndices = new Set(zIndices);
    
    expect(uniqueZIndices.size).toBe(4); // All unique
    expect(Math.min(...zIndices)).toBe(1);
    expect(Math.max(...zIndices)).toBe(4);
  });

  it('should verify z-indices are sequential (1, 2, 3, ...)', () => {
    renderComponent();

    const addBtn = screen.getByTestId('add-rect-btn');

    // Add 5 rectangles
    act(() => {
      for (let i = 0; i < 5; i++) {
        addBtn.click();
      }
    });

    const container = screen.getByTestId('rectangles-container');
    const rects = container.querySelectorAll('[data-testid^="rect-"]');
    const zIndices = Array.from(rects).map(rect => parseInt(rect.getAttribute('data-zindex') || '0'));
    
    // Sort and verify sequential
    const sortedZIndices = [...zIndices].sort((a, b) => a - b);
    expect(sortedZIndices).toEqual([1, 2, 3, 4, 5]);
  });
});

