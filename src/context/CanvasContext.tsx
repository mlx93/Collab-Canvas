// Canvas Context with React Context API
import React, { createContext, useState, ReactNode } from 'react';
import { Rectangle, CanvasState, Viewport, Tool } from '../types/canvas.types';
import { MIN_ZOOM, MAX_ZOOM } from '../utils/constants';

interface CanvasContextType {
  // State
  rectangles: Rectangle[];
  viewport: Viewport;
  selectedRectangleId: string | null;
  currentTool: Tool;
  loading: boolean;
  error: string | null;
  
  // Viewport operations
  setViewport: (viewport: Viewport) => void;
  panViewport: (deltaX: number, deltaY: number) => void;
  zoomViewport: (delta: number, centerX?: number, centerY?: number) => void;
  
  // Rectangle operations
  addRectangle: (rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'>) => void;
  updateRectangle: (id: string, updates: Partial<Rectangle>) => void;
  deleteRectangle: (id: string) => void;
  setSelectedRectangle: (id: string | null) => void;
  
  // Z-index operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Tool operations
  setTool: (tool: Tool) => void;
  
  // Utility
  clearError: () => void;
}

export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

interface CanvasProviderProps {
  children: ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    rectangles: [],
    viewport: { x: 0, y: 0, scale: 1 },
    selectedRectangleId: null,
    currentTool: 'select',
    loading: false,
    error: null
  });

  // Viewport operations
  const setViewport = (viewport: Viewport) => {
    setCanvasState(prev => ({ ...prev, viewport }));
  };

  const panViewport = (deltaX: number, deltaY: number) => {
    setCanvasState(prev => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        x: prev.viewport.x + deltaX,
        y: prev.viewport.y + deltaY
      }
    }));
  };

  const zoomViewport = (delta: number, centerX?: number, centerY?: number) => {
    setCanvasState(prev => {
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.viewport.scale + delta));
      
      // If center point provided, zoom towards that point
      if (centerX !== undefined && centerY !== undefined) {
        const scaleRatio = newScale / prev.viewport.scale;
        const newX = centerX - (centerX - prev.viewport.x) * scaleRatio;
        const newY = centerY - (centerY - prev.viewport.y) * scaleRatio;
        
        return {
          ...prev,
          viewport: {
            x: newX,
            y: newY,
            scale: newScale
          }
        };
      }
      
      return {
        ...prev,
        viewport: {
          ...prev.viewport,
          scale: newScale
        }
      };
    });
  };

  // Rectangle operations
  const addRectangle = (rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'>) => {
    const newRectangle: Rectangle = {
      ...rectangle,
      id: `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      zIndex: 1, // New rectangles go to front
      createdAt: new Date(),
      lastModified: new Date()
    };

    setCanvasState(prev => {
      // Increment z-index of all existing rectangles
      const updatedRectangles = prev.rectangles.map(rect => ({
        ...rect,
        zIndex: rect.zIndex + 1
      }));

      return {
        ...prev,
        rectangles: [...updatedRectangles, newRectangle]
      };
    });
  };

  const updateRectangle = (id: string, updates: Partial<Rectangle>) => {
    setCanvasState(prev => ({
      ...prev,
      rectangles: prev.rectangles.map(rect =>
        rect.id === id
          ? { ...rect, ...updates, lastModified: new Date() }
          : rect
      )
    }));
  };

  const deleteRectangle = (id: string) => {
    setCanvasState(prev => ({
      ...prev,
      rectangles: prev.rectangles.filter(rect => rect.id !== id),
      selectedRectangleId: prev.selectedRectangleId === id ? null : prev.selectedRectangleId
    }));
  };

  const setSelectedRectangle = (id: string | null) => {
    setCanvasState(prev => ({ ...prev, selectedRectangleId: id }));
  };

  // Z-index operations
  const bringToFront = (id: string) => {
    setCanvasState(prev => {
      const targetRect = prev.rectangles.find(rect => rect.id === id);
      if (!targetRect || targetRect.zIndex === 1) return prev; // Already at front

      // Decrement z-index of all rectangles with lower zIndex
      const updatedRectangles = prev.rectangles.map(rect => {
        if (rect.id === id) {
          return { ...rect, zIndex: 1 };
        }
        if (rect.zIndex < targetRect.zIndex) {
          return { ...rect, zIndex: rect.zIndex + 1 };
        }
        return rect;
      });

      return { ...prev, rectangles: updatedRectangles };
    });
  };

  const sendToBack = (id: string) => {
    setCanvasState(prev => {
      const targetRect = prev.rectangles.find(rect => rect.id === id);
      if (!targetRect) return prev;

      const maxZIndex = Math.max(...prev.rectangles.map(r => r.zIndex), 0);
      if (targetRect.zIndex === maxZIndex) return prev; // Already at back

      // Increment z-index of all rectangles with higher zIndex
      const updatedRectangles = prev.rectangles.map(rect => {
        if (rect.id === id) {
          return { ...rect, zIndex: maxZIndex + 1 };
        }
        if (rect.zIndex > targetRect.zIndex) {
          return { ...rect, zIndex: rect.zIndex - 1 };
        }
        return rect;
      });

      return { ...prev, rectangles: updatedRectangles };
    });
  };

  // Tool operations
  const setTool = (tool: Tool) => {
    setCanvasState(prev => ({ ...prev, currentTool: tool }));
  };

  // Utility
  const clearError = () => {
    setCanvasState(prev => ({ ...prev, error: null }));
  };

  const value: CanvasContextType = {
    // State
    rectangles: canvasState.rectangles,
    viewport: canvasState.viewport,
    selectedRectangleId: canvasState.selectedRectangleId,
    currentTool: canvasState.currentTool,
    loading: canvasState.loading,
    error: canvasState.error,
    
    // Viewport operations
    setViewport,
    panViewport,
    zoomViewport,
    
    // Rectangle operations
    addRectangle,
    updateRectangle,
    deleteRectangle,
    setSelectedRectangle,
    
    // Z-index operations
    bringToFront,
    sendToBack,
    
    // Tool operations
    setTool,
    
    // Utility
    clearError
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
};
