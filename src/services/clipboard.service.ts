// Clipboard service for copy/paste functionality
import { Shape } from '../types/canvas.types';

// Removed unused ClipboardState interface (not exported/consumed)

// In-memory clipboard state
let clipboard: Shape[] = [];

export interface ClipboardService {
  copyShapes: (shapes: Shape[]) => void;
  pasteShapes: (cursorX?: number, cursorY?: number) => Shape[];
  clearClipboard: () => void;
  hasClipboard: () => boolean;
  getClipboard: () => Shape[];
}

export const clipboardService: ClipboardService = {
  copyShapes: (shapes: Shape[]) => {
    // Deep clone shapes, remove IDs for paste generation
    const cloned = shapes.map(shape => ({
      ...shape,
      id: undefined as any // Remove ID for paste generation
    }));
    clipboard = cloned;
  },

  pasteShapes: (cursorX?: number, cursorY?: number) => {
    if (clipboard.length === 0) return [];
    
    // If no cursor position provided, use a default offset
    const defaultOffset = 20;
    const pasteX = cursorX !== undefined ? cursorX : (clipboard[0]?.x || 0) + defaultOffset;
    const pasteY = cursorY !== undefined ? cursorY : (clipboard[0]?.y || 0) + defaultOffset;
    
    // Calculate the offset from the original position to maintain relative positioning
    const originalCenterX = clipboard.reduce((sum, shape) => sum + shape.x, 0) / clipboard.length;
    const originalCenterY = clipboard.reduce((sum, shape) => sum + shape.y, 0) / clipboard.length;
    
    return clipboard.map(shape => ({
      ...shape,
      id: 'temp-' + Date.now() + Math.random().toString(36).substr(2, 9),
      x: pasteX + (shape.x - originalCenterX),
      y: pasteY + (shape.y - originalCenterY),
      zIndex: 0, // Will be set to maxZIndex + 1 by the context
      createdBy: '', // Will be set by the context
      createdAt: new Date(),
      lastModifiedBy: '', // Will be set by the context
      lastModified: new Date()
    }));
  },

  clearClipboard: () => {
    clipboard = [];
  },

  hasClipboard: () => {
    return clipboard.length > 0;
  },

  getClipboard: () => {
    return [...clipboard]; // Return a copy to prevent external modification
  }
};
