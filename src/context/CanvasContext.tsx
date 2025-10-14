// Canvas Context with React Context API and Firestore integration
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Rectangle, CanvasState, Viewport, Tool } from '../types/canvas.types';
import { MIN_ZOOM, MAX_ZOOM } from '../utils/constants';
import { autoUpdateZIndex, manualSetZIndex } from '../services/zIndex.service';
import { useAuth } from '../hooks/useAuth';
import * as canvasService from '../services/canvas.service';

interface CanvasContextType {
  // State
  rectangles: Rectangle[];
  viewport: Viewport;
  selectedRectangleId: string | null;
  currentTool: Tool;
  loading: boolean;
  error: string | null;
  stageSize: { width: number; height: number };
  
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
  setZIndex: (id: string, zIndex: number) => void;
  
  // Tool operations
  setTool: (tool: Tool) => void;
  
  // Utility
  clearError: () => void;
  setStageSize: (size: { width: number; height: number }) => void;
}

export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

interface CanvasProviderProps {
  children: ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [canvasState, setCanvasState] = useState<CanvasState>({
    rectangles: [],
    viewport: { x: 0, y: 0, scale: 1 },
    selectedRectangleId: null,
    currentTool: 'select',
    loading: true, // Start with loading true while fetching from Firestore
    error: null,
    stageSize: { width: 800, height: 600 } // Default size, will be updated by Canvas component
  });

  // Subscribe to Firestore real-time updates
  useEffect(() => {
    const unsubscribe = canvasService.subscribeToShapes((shapes) => {
      setCanvasState(prev => ({
        ...prev,
        rectangles: shapes,
        loading: false
      }));
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

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
  const addRectangle = async (rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'>) => {
    // Optimistic update: add to local state immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRectangle: Rectangle = {
      ...rectangle,
      id: tempId,
      zIndex: 1, // New rectangles go to front
      createdAt: new Date(),
      lastModified: new Date()
    };

    setCanvasState(prev => {
      // Use z-index service to auto-move new rectangle to front
      const allRectangles = [...prev.rectangles, newRectangle];
      const reorderedRectangles = autoUpdateZIndex(allRectangles, newRectangle.id);

      return {
        ...prev,
        rectangles: reorderedRectangles,
        selectedRectangleId: newRectangle.id // Auto-select newly created rectangle
      };
    });

    // Sync to Firestore in background
    try {
      await canvasService.createRectangle(rectangle);
    } catch (error) {
      console.error('Failed to create rectangle in Firestore:', error);
      // Revert optimistic update on failure
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedRectangleId: prev.selectedRectangleId === tempId ? null : prev.selectedRectangleId
      }));
    }
  };

  const updateRectangle = async (id: string, updates: Partial<Rectangle>) => {
    // Optimistic update: update local state immediately
    setCanvasState(prev => {
      // If manual z-index update, use manualSetZIndex (don't apply zIndex in map yet)
      if (updates.zIndex !== undefined) {
        // Apply non-zIndex updates first
        const { zIndex, ...otherUpdates } = updates;
        const rectanglesWithOtherUpdates = prev.rectangles.map(rect =>
          rect.id === id
            ? { ...rect, ...otherUpdates, lastModified: new Date() }
            : rect
        );
        
        // Then apply z-index via manualSetZIndex
        return {
          ...prev,
          rectangles: manualSetZIndex(rectanglesWithOtherUpdates, id, zIndex)
        };
      }

      // Update the rectangle for non-zIndex changes
      const updatedRectangles = prev.rectangles.map(rect =>
        rect.id === id
          ? { ...rect, ...updates, lastModified: new Date() }
          : rect
      );

      // Auto-move to front when editing position, size, or color
      const isEditAction = updates.x !== undefined || updates.y !== undefined || 
                           updates.width !== undefined || updates.height !== undefined || 
                           updates.color !== undefined;
      
      if (isEditAction) {
        return {
          ...prev,
          rectangles: autoUpdateZIndex(updatedRectangles, id)
        };
      }

      // No z-index change needed
      return {
        ...prev,
        rectangles: updatedRectangles
      };
    });

    // Sync to Firestore in background
    try {
      await canvasService.updateRectangle(id, updates);
    } catch (error) {
      console.error('Failed to update rectangle in Firestore:', error);
      // The Firestore listener will eventually sync the correct state
    }
  };

  const deleteRectangle = async (id: string) => {
    // Optimistic update: remove from local state immediately
    setCanvasState(prev => ({
      ...prev,
      rectangles: prev.rectangles.filter(rect => rect.id !== id),
      selectedRectangleId: prev.selectedRectangleId === id ? null : prev.selectedRectangleId
    }));

    // Sync to Firestore in background
    try {
      await canvasService.deleteRectangle(id);
    } catch (error) {
      console.error('Failed to delete rectangle from Firestore:', error);
      // The Firestore listener will eventually sync the correct state
    }
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

      // Move target to back (maxZIndex) and shift others down
      const updatedRectangles = prev.rectangles.map(rect => {
        if (rect.id === id) {
          return { ...rect, zIndex: maxZIndex };
        }
        // Shapes between target's old position and maxZIndex shift down by 1
        if (rect.zIndex > targetRect.zIndex && rect.zIndex <= maxZIndex) {
          return { ...rect, zIndex: rect.zIndex - 1 };
        }
        return rect;
      });

      return { ...prev, rectangles: updatedRectangles };
    });
  };

  const setZIndex = async (id: string, zIndex: number) => {
    // Optimistic update: update local state immediately
    setCanvasState(prev => {
      const updatedRectangles = manualSetZIndex(prev.rectangles, id, zIndex);
      
      // Add metadata if user is available
      if (user) {
        return {
          ...prev,
          rectangles: updatedRectangles.map(rect =>
            rect.id === id
              ? { ...rect, lastModified: new Date(), lastModifiedBy: user.userId }
              : rect
          )
        };
      }
      
      return {
        ...prev,
        rectangles: updatedRectangles
      };
    });

    // Sync to Firestore in background
    try {
      await canvasService.updateZIndex(id, zIndex);
    } catch (error) {
      console.error('Failed to update z-index in Firestore:', error);
      // The Firestore listener will eventually sync the correct state
    }
  };

  // Tool operations
  const setTool = (tool: Tool) => {
    setCanvasState(prev => ({ ...prev, currentTool: tool }));
  };

  // Utility
  const clearError = () => {
    setCanvasState(prev => ({ ...prev, error: null }));
  };

  const setStageSize = (size: { width: number; height: number }) => {
    setCanvasState(prev => {
      // Only update if size actually changed (prevent unnecessary re-renders)
      if (prev.stageSize.width === size.width && prev.stageSize.height === size.height) {
        return prev;
      }
      return { ...prev, stageSize: size };
    });
  };

  const value: CanvasContextType = {
    // State
    rectangles: canvasState.rectangles,
    viewport: canvasState.viewport,
    selectedRectangleId: canvasState.selectedRectangleId,
    currentTool: canvasState.currentTool,
    loading: canvasState.loading,
    error: canvasState.error,
    stageSize: canvasState.stageSize,
    
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
    setZIndex,
    
    // Tool operations
    setTool,
    
    // Utility
    clearError,
    setStageSize
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
};
