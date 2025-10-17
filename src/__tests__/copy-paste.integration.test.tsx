// Copy/Paste integration tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CanvasProvider, CanvasContext } from '../context/CanvasContext';
import { AuthProvider } from '../context/AuthContext';
import { clipboardService } from '../services/clipboard.service';
import { RectangleShape } from '../types/canvas.types';

// Mock Firebase
jest.mock('../services/firebase', () => ({
  auth: {
    currentUser: { email: 'test@example.com', uid: 'test-uid' }
  },
  firestore: {},
  rtdb: {}
}));

// Mock canvas service
jest.mock('../services/canvas.service', () => ({
  subscribeToShapes: jest.fn(() => jest.fn()),
  createRectangle: jest.fn().mockResolvedValue(undefined),
  updateRectangle: jest.fn().mockResolvedValue(undefined),
  deleteRectangle: jest.fn().mockResolvedValue(undefined)
}));

// Mock other services
jest.mock('../services/liveSelections.service', () => ({
  setLiveSelection: jest.fn(),
  clearLiveSelection: jest.fn()
}));

jest.mock('../services/cursor.service', () => ({
  getCursorColorForUser: jest.fn(() => ({ cursorColor: '#FF0000' }))
}));

jest.mock('../services/activeEdits.service', () => ({
  clearActiveEdit: jest.fn()
}));

jest.mock('../services/zIndex.service', () => ({
  autoUpdateZIndex: jest.fn((shapes) => shapes),
  manualSetZIndex: jest.fn((shapes) => shapes)
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

// Test component that uses copy/paste functionality
const TestComponent: React.FC = () => {
  const { copyShapes, pasteShapes, rectangles, selectedIds } = React.useContext(CanvasContext);
  
  return (
    <div>
      <div data-testid="shape-count">{rectangles.length}</div>
      <div data-testid="selected-count">{selectedIds.length}</div>
      <button data-testid="copy-btn" onClick={copyShapes}>Copy</button>
      <button data-testid="paste-btn" onClick={pasteShapes}>Paste</button>
      <div data-testid="clipboard-status">{clipboardService.hasClipboard() ? 'has-clipboard' : 'no-clipboard'}</div>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      <CanvasProvider>
        {component}
      </CanvasProvider>
    </AuthProvider>
  );
};

describe('Copy/Paste Integration', () => {
  beforeEach(() => {
    clipboardService.clearClipboard();
    jest.clearAllMocks();
  });

  it('should copy and paste shapes with proper offset', async () => {
    // Mock initial shapes
    const mockShapes: RectangleShape[] = [
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
        createdBy: 'test@example.com',
        createdAt: new Date(),
        lastModifiedBy: 'test@example.com',
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
        createdBy: 'test@example.com',
        createdAt: new Date(),
        lastModifiedBy: 'test@example.com',
        lastModified: new Date()
      }
    ];

    // Mock the subscribeToShapes to return our test shapes
    const { subscribeToShapes } = require('../services/canvas.service');
    subscribeToShapes.mockImplementation((callback: (shapes: any[]) => void) => {
      callback(mockShapes);
      return jest.fn(); // unsubscribe function
    });

    renderWithProviders(<TestComponent />);

    // Initially should have 2 shapes
    expect(screen.getByTestId('shape-count')).toHaveTextContent('2');
    expect(screen.getByTestId('clipboard-status')).toHaveTextContent('no-clipboard');

    // Simulate selecting shapes (this would normally be done through UI interactions)
    // For this test, we'll directly test the clipboard service
    clipboardService.copyShapes(mockShapes);
    
    expect(screen.getByTestId('clipboard-status')).toHaveTextContent('has-clipboard');

    // Test paste functionality
    const pasteBtn = screen.getByTestId('paste-btn');
    fireEvent.click(pasteBtn);

    // Wait for async operations
    await waitFor(() => {
      expect(require('react-hot-toast').success).toHaveBeenCalledWith('Pasted 2 shape(s)');
    });

    // Verify that createRectangle was called for each pasted shape
    const { createRectangle } = require('../services/canvas.service');
    expect(createRectangle).toHaveBeenCalledTimes(2);
  });

  it('should handle copy with no selection', async () => {
    const { subscribeToShapes } = require('../services/canvas.service');
    subscribeToShapes.mockImplementation((callback: (shapes: any[]) => void) => {
      callback([]);
      return jest.fn();
    });

    renderWithProviders(<TestComponent />);

    const copyBtn = screen.getByTestId('copy-btn');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(require('react-hot-toast').error).toHaveBeenCalledWith('No shapes selected to copy');
    });
  });

  it('should handle paste with empty clipboard', async () => {
    const { subscribeToShapes } = require('../services/canvas.service');
    subscribeToShapes.mockImplementation((callback: (shapes: any[]) => void) => {
      callback([]);
      return jest.fn();
    });

    renderWithProviders(<TestComponent />);

    const pasteBtn = screen.getByTestId('paste-btn');
    fireEvent.click(pasteBtn);

    await waitFor(() => {
      expect(require('react-hot-toast').error).toHaveBeenCalledWith('Nothing to paste');
    });
  });

  it('should maintain relative positions in multi-selection copy/paste', () => {
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
        createdBy: 'test@example.com',
        createdAt: new Date(),
        lastModifiedBy: 'test@example.com',
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
        createdBy: 'test@example.com',
        createdAt: new Date(),
        lastModifiedBy: 'test@example.com',
        lastModified: new Date()
      }
    ];

    // Copy shapes
    clipboardService.copyShapes(shapes);
    
    // Paste with offset
    const pasted = clipboardService.pasteShapes(20, 20);
    
    // Verify relative positions are maintained
    expect(pasted).toHaveLength(2);
    expect(pasted[0].x).toBe(120); // 100 + 20
    expect(pasted[0].y).toBe(120); // 100 + 20
    expect(pasted[1].x).toBe(220); // 200 + 20
    expect(pasted[1].y).toBe(220); // 200 + 20
    
    // Verify the relative distance is maintained
    const originalDistanceX = shapes[1].x - shapes[0].x; // 100
    const originalDistanceY = shapes[1].y - shapes[0].y; // 100
    const pastedDistanceX = pasted[1].x - pasted[0].x; // 100
    const pastedDistanceY = pasted[1].y - pasted[0].y; // 100
    
    expect(pastedDistanceX).toBe(originalDistanceX);
    expect(pastedDistanceY).toBe(originalDistanceY);
  });
});
