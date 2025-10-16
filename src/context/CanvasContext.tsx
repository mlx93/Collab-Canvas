// Canvas Context with React Context API and Firestore integration
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Rectangle, TriangleShape, Shape, CanvasState, Viewport, Tool } from '../types/canvas.types';
import { MIN_ZOOM, MAX_ZOOM, DEFAULT_COLOR } from '../utils/constants';
import { autoUpdateZIndex, manualSetZIndex } from '../services/zIndex.service';
import { useAuth } from '../hooks/useAuth';
import * as canvasService from '../services/canvas.service';
import { setSelection, clearSelection } from '../services/selection.service';

interface CanvasContextType {
  // State
  rectangles: Shape[]; // Now stores all shape types
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
  
  // Shape operations (simplified API for toolbar)
  addRectangle: () => void; // Simplified: creates rectangle at viewport center with smart offset
  addCircle: () => void; // Simplified: creates circle at viewport center with smart offset
  addTriangle: () => void; // Simplified: creates triangle at viewport center with smart offset
  addLine: () => void; // Simplified: creates line at viewport center with smart offset
  addText: () => void; // Simplified: creates text at viewport center with smart offset
  addRectangleFull: (rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => void; // Full API for tests
  updateRectangle: (id: string, updates: Partial<Shape>) => void;
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
      setCanvasState(prev => {
        let newSelectedId = prev.selectedRectangleId;
        
        // If we have a temp ID selected and a new real shape came in, 
        // find if the new shape matches and update selection to the real ID
        if (newSelectedId && newSelectedId.startsWith('temp-')) {
          const tempShape = prev.rectangles.find(r => r.id === newSelectedId);
          if (tempShape) {
            let matchingShape: Shape | undefined;
            
            // Match based on shape type
            for (const s of shapes) {
              // Convert Firestore Timestamp to Date if needed
              const createdAtTime = s.createdAt instanceof Date 
                ? s.createdAt.getTime() 
                : (s.createdAt as any).toDate().getTime();
              
              // Must be same type and created recently
              if (s.type !== tempShape.type) continue;
              if (Math.abs(createdAtTime - Date.now()) >= 5000) continue;
              
              // Check position and color match
              const positionMatches = Math.abs(s.x - tempShape.x) < 1 && 
                                     Math.abs(s.y - tempShape.y) < 1;
              const colorMatches = s.color === tempShape.color;
              
              if (!positionMatches || !colorMatches) continue;
              
              // Check shape-specific properties (use as any to bypass TypeScript narrowing issues)
              let shapeSpecificMatch = false;
              const sAny = s as any;
              const tempAny = tempShape as any;
              
              if (sAny.type === 'rectangle') {
                shapeSpecificMatch = Math.abs(sAny.width - tempAny.width) < 1 &&
                                    Math.abs(sAny.height - tempAny.height) < 1;
              }
              
              if (sAny.type === 'circle') {
                shapeSpecificMatch = Math.abs(sAny.radius - tempAny.radius) < 1;
              }
              
              if (sAny.type === 'triangle') {
                shapeSpecificMatch = Math.abs(sAny.width - tempAny.width) < 1 &&
                                    Math.abs(sAny.height - tempAny.height) < 1;
              }
              
              if (sAny.type === 'line') {
                shapeSpecificMatch = Math.abs(sAny.x2 - tempAny.x2) < 1 &&
                                    Math.abs(sAny.y2 - tempAny.y2) < 1 &&
                                    Math.abs(sAny.strokeWidth - tempAny.strokeWidth) < 1;
              }
              
        if (sAny.type === 'text') {
          shapeSpecificMatch = sAny.text === tempAny.text &&
                              Math.abs(sAny.width - tempAny.width) < 1 &&
                              Math.abs((sAny.height || 30) - (tempAny.height || 30)) < 1 &&
                              Math.abs(sAny.fontSize - tempAny.fontSize) < 1;
        }
              
              if (shapeSpecificMatch) {
                matchingShape = s;
                break;
              }
            }
            
            if (matchingShape) {
              newSelectedId = matchingShape.id;
            }
          }
        }
        
        return {
          ...prev,
          rectangles: shapes,
          selectedRectangleId: newSelectedId,
          loading: false
        };
      });
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

  // Shape operations
  // Simplified addRectangle for toolbar use
  const addRectangle = () => {
    if (!user) return;

    // Calculate center of viewport accounting for properties panel (288px = w-72)
    const canvasVisibleWidth = canvasState.stageSize.width;
    const canvasVisibleHeight = canvasState.stageSize.height;
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    
    // Center in available canvas space (accounting for properties panel)
    const availableWidth = canvasVisibleWidth - propertiesPanelWidth;
    const baseCenterX = -canvasState.viewport.x / canvasState.viewport.scale + (availableWidth / 2) / canvasState.viewport.scale - 50;
    const baseCenterY = -canvasState.viewport.y / canvasState.viewport.scale + (canvasVisibleHeight / 2) / canvasState.viewport.scale - 50;

    let targetX = baseCenterX;
    let targetY = baseCenterY;

    // Smart offset: Avoid overlapping with existing shapes
    const OVERLAP_THRESHOLD = 50;
    const OFFSET_AMOUNT = 20;
    const MAX_ATTEMPTS = 50;

    let attempt = 0;
    let foundNonOverlappingPosition = false;

    const checkOverlap = (x: number, y: number) => {
      return canvasState.rectangles.some(rect => {
        const distanceX = Math.abs(rect.x - x);
        const distanceY = Math.abs(rect.y - y);
        return distanceX < OVERLAP_THRESHOLD && distanceY < OVERLAP_THRESHOLD;
      });
    };

    while (attempt < MAX_ATTEMPTS && !foundNonOverlappingPosition) {
      const hasOverlap = checkOverlap(targetX, targetY);
      if (!hasOverlap) {
        foundNonOverlappingPosition = true;
      } else {
        targetX = baseCenterX + (OFFSET_AMOUNT * (attempt + 1));
        targetY = baseCenterY + (OFFSET_AMOUNT * (attempt + 1));
        attempt++;
      }
    }

    // Create rectangle with default values
    addRectangleFull({
      x: targetX,
      y: targetY,
      width: 100,
      height: 100,
      color: DEFAULT_COLOR,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Simplified addCircle for toolbar (creates circle at viewport center with smart offset)
  const addCircle = () => {
    if (!user?.email) return;

    // Calculate visible canvas center accounting for properties panel (288px = w-72)
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    const availableWidth = canvasState.stageSize.width - propertiesPanelWidth;
    const baseCenterX = (-canvasState.viewport.x + (availableWidth / 2)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2)) / canvasState.viewport.scale;

    let targetX = baseCenterX;
    let targetY = baseCenterY;

    // Smart offset: check for overlap with any existing shape
    const OVERLAP_THRESHOLD = 20; // px
    const OFFSET_AMOUNT = 30; // px
    const MAX_ATTEMPTS = 10;
    let attempt = 0;
    let foundNonOverlappingPosition = false;

    const checkOverlap = (x: number, y: number) => {
      return canvasState.rectangles.some(shape => {
        const distanceX = Math.abs(shape.x - x);
        const distanceY = Math.abs(shape.y - y);
        return distanceX < OVERLAP_THRESHOLD && distanceY < OVERLAP_THRESHOLD;
      });
    };

    while (attempt < MAX_ATTEMPTS && !foundNonOverlappingPosition) {
      const hasOverlap = checkOverlap(targetX, targetY);
      if (!hasOverlap) {
        foundNonOverlappingPosition = true;
      } else {
        targetX = baseCenterX + (OFFSET_AMOUNT * (attempt + 1));
        targetY = baseCenterY + (OFFSET_AMOUNT * (attempt + 1));
        attempt++;
      }
    }

    // Create circle with default values
    addCircleFull({
      x: targetX,
      y: targetY,
      radius: 50, // Default radius for circles
      color: DEFAULT_COLOR,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Full addCircle API
  const addCircleFull = async (circle: Omit<import('../types/canvas.types').CircleShape, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    // Optimistic update: add to local state immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setCanvasState(prev => {
      // Calculate highest z-index + 1 for new circle (higher = front)
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      const newCircle: import('../types/canvas.types').CircleShape = {
        ...circle,
        type: 'circle',
        id: tempId,
        rotation: 0, // Default rotation
        opacity: 1, // Default opacity
        zIndex: maxZIndex + 1, // New circle goes to front
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newCircle],
        selectedRectangleId: newCircle.id // Auto-select newly created circle
      };
    });

    // Sync to Firestore in background
    try {
      // Add the required fields before persisting
      const fullCircle = {
        ...circle,
        type: 'circle' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullCircle as any); // TODO: Update service to accept Shape
    } catch (error) {
      console.error('Failed to create circle in Firestore:', error);
      // Revert optimistic update on failure
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedRectangleId: prev.selectedRectangleId === tempId ? null : prev.selectedRectangleId
      }));
    }
  };

  // Simplified addTriangle for toolbar (creates triangle at viewport center with smart offset)
  const addTriangle = () => {
    if (!user?.email) return;

    // Calculate visible canvas center accounting for properties panel (288px = w-72)
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    const availableWidth = canvasState.stageSize.width - propertiesPanelWidth;
    const baseCenterX = (-canvasState.viewport.x + (availableWidth / 2)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2)) / canvasState.viewport.scale;

    let targetX = baseCenterX;
    let targetY = baseCenterY;

    // Smart offset logic
    const OVERLAP_THRESHOLD = 20;
    const OFFSET_AMOUNT = 30;
    const MAX_ATTEMPTS = 10;
    let attempt = 0;
    let foundNonOverlappingPosition = false;

    const checkOverlap = (x: number, y: number) => {
      return canvasState.rectangles.some(shape => {
        const distanceX = Math.abs(shape.x - x);
        const distanceY = Math.abs(shape.y - y);
        return distanceX < OVERLAP_THRESHOLD && distanceY < OVERLAP_THRESHOLD;
      });
    };

    while (attempt < MAX_ATTEMPTS && !foundNonOverlappingPosition) {
      if (!checkOverlap(targetX, targetY)) {
        foundNonOverlappingPosition = true;
      } else {
        targetX = baseCenterX + (OFFSET_AMOUNT * (attempt + 1));
        targetY = baseCenterY + (OFFSET_AMOUNT * (attempt + 1));
        attempt++;
      }
    }

    // Create triangle with default values
    addTriangleFull({
      x: targetX,
      y: targetY,
      width: 100,
      height: 100,
      color: DEFAULT_COLOR,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Full addTriangle API
  const addTriangleFull = async (triangle: Omit<TriangleShape, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setCanvasState(prev => {
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      const newTriangle: TriangleShape = {
        ...triangle,
        type: 'triangle',
        id: tempId,
        rotation: 0,
        opacity: 1,
        zIndex: maxZIndex + 1,
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newTriangle],
        selectedRectangleId: newTriangle.id
      };
    });

    try {
      const fullTriangle = {
        ...triangle,
        type: 'triangle' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullTriangle as any);
    } catch (error) {
      console.error('Failed to create triangle in Firestore:', error);
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedRectangleId: prev.selectedRectangleId === tempId ? null : prev.selectedRectangleId
      }));
    }
  };

  // Simplified addLine for toolbar (creates line at viewport center with smart offset)
  const addLine = () => {
    if (!user?.email) return;

    // Calculate visible canvas center
    const baseCenterX = (-canvasState.viewport.x + (canvasState.stageSize.width / 2)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2)) / canvasState.viewport.scale;

    let targetX = baseCenterX;
    let targetY = baseCenterY;

    // Smart offset logic
    const OVERLAP_THRESHOLD = 20;
    const OFFSET_AMOUNT = 30;
    const MAX_ATTEMPTS = 10;
    let attempt = 0;
    let foundNonOverlappingPosition = false;

    const checkOverlap = (x: number, y: number) => {
      return canvasState.rectangles.some(shape => {
        const distanceX = Math.abs(shape.x - x);
        const distanceY = Math.abs(shape.y - y);
        return distanceX < OVERLAP_THRESHOLD && distanceY < OVERLAP_THRESHOLD;
      });
    };

    while (attempt < MAX_ATTEMPTS && !foundNonOverlappingPosition) {
      if (!checkOverlap(targetX, targetY)) {
        foundNonOverlappingPosition = true;
      } else {
        targetX = baseCenterX + (OFFSET_AMOUNT * (attempt + 1));
        targetY = baseCenterY + (OFFSET_AMOUNT * (attempt + 1));
        attempt++;
      }
    }

    // Create line with default values (100px horizontal line)
    addLineFull({
      x: targetX,
      y: targetY,
      x2: targetX + 100, // 100px horizontal line
      y2: targetY,
      strokeWidth: 2, // Default stroke width
      color: DEFAULT_COLOR,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  const addText = () => {
    if (!user?.email) return;

    // Calculate visible canvas center accounting for properties panel (288px = w-72)
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    const availableWidth = canvasState.stageSize.width - propertiesPanelWidth;
    const baseCenterX = (-canvasState.viewport.x + (availableWidth / 2)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2)) / canvasState.viewport.scale;

    let targetX = baseCenterX;
    let targetY = baseCenterY;

    // Smart offset logic
    const OVERLAP_THRESHOLD = 20;
    const OFFSET_AMOUNT = 30;
    const MAX_ATTEMPTS = 10;
    let attempt = 0;
    let foundNonOverlappingPosition = false;

    const checkOverlap = (x: number, y: number) => {
      return canvasState.rectangles.some(shape => {
        const distanceX = Math.abs(shape.x - x);
        const distanceY = Math.abs(shape.y - y);
        return distanceX < OVERLAP_THRESHOLD && distanceY < OVERLAP_THRESHOLD;
      });
    };

    while (attempt < MAX_ATTEMPTS && !foundNonOverlappingPosition) {
      if (!checkOverlap(targetX, targetY)) {
        foundNonOverlappingPosition = true;
      } else {
        targetX = baseCenterX + (OFFSET_AMOUNT * (attempt + 1));
        targetY = baseCenterY + (OFFSET_AMOUNT * (attempt + 1));
        attempt++;
      }
    }

    // Create text with default values
    addTextFull({
      x: targetX,
      y: targetY,
      width: 200, // Default text width
      height: 30, // Default text height
      text: 'Double-click to edit',
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: DEFAULT_COLOR,
      backgroundColor: 'transparent', // Default to translucent background
      textColor: '#000000',
      borderColor: 'transparent', // Default to translucent border
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Full addLine API
  const addLineFull = async (line: Omit<import('../types/canvas.types').LineShape, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setCanvasState(prev => {
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      const newLine: import('../types/canvas.types').LineShape = {
        ...line,
        type: 'line',
        id: tempId,
        rotation: 0,
        opacity: 1,
        zIndex: maxZIndex + 1,
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newLine],
        selectedRectangleId: newLine.id
      };
    });

    try {
      const fullLine = {
        ...line,
        type: 'line' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullLine as any);
    } catch (error) {
      console.error('Failed to create line in Firestore:', error);
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedRectangleId: prev.selectedRectangleId === tempId ? null : prev.selectedRectangleId
      }));
    }
  };

  // Full addText API
  const addTextFull = async (text: Omit<import('../types/canvas.types').TextShape, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setCanvasState(prev => {
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      const newText: import('../types/canvas.types').TextShape = {
        ...text,
        type: 'text',
        id: tempId,
        rotation: 0,
        opacity: 1,
        zIndex: maxZIndex + 1,
        createdAt: new Date(),
        lastModified: new Date()
      };
      return {
        ...prev,
        rectangles: [...prev.rectangles, newText],
        selectedRectangleId: newText.id
      };
    });

    try {
      const fullText = {
        ...text,
        type: 'text' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullText as any); // TODO: Update service to accept Shape
    } catch (error) {
      console.error('Failed to create text in Firestore:', error);
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedRectangleId: prev.selectedRectangleId === tempId ? null : prev.selectedRectangleId
      }));
    }
  };

  // Full addRectangle for backward compatibility and tests
  const addRectangleFull = async (rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    // Optimistic update: add to local state immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setCanvasState(prev => {
      // Calculate highest z-index + 1 for new rectangle (higher = front)
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      const newRectangle: Rectangle = {
        ...rectangle,
        type: 'rectangle',
        id: tempId,
        rotation: 0, // Default rotation
        opacity: 1, // Default opacity
        zIndex: maxZIndex + 1, // New rectangle goes to front
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newRectangle],
        selectedRectangleId: newRectangle.id // Auto-select newly created rectangle
      };
    });

    // Sync to Firestore in background
    try {
      // Add the required fields before persisting
      const fullRectangle = {
        ...rectangle,
        type: 'rectangle' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullRectangle);
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

  const updateRectangle = async (id: string, updates: Partial<Shape>) => {
    // Optimistic update: update local state immediately
    setCanvasState(prev => {
      // If manual z-index update, use manualSetZIndex (don't apply zIndex in map yet)
      if (updates.zIndex !== undefined) {
        // Apply non-zIndex updates first
        const { zIndex, ...otherUpdates } = updates;
        const rectanglesWithOtherUpdates: Shape[] = prev.rectangles.map(rect =>
          rect.id === id
            ? { ...rect, ...otherUpdates, lastModified: new Date() } as Shape
            : rect
        );
        
        // Then apply z-index via manualSetZIndex
        return {
          ...prev,
          rectangles: manualSetZIndex(rectanglesWithOtherUpdates, id, zIndex)
        };
      }

      // Update the rectangle for non-zIndex changes
      const updatedRectangles: Shape[] = prev.rectangles.map(rect =>
        rect.id === id
          ? { ...rect, ...updates, lastModified: new Date() } as Shape
          : rect
      );

      // Auto-move to front when editing position, size, or color
      const isEditAction = updates.x !== undefined || updates.y !== undefined || 
                           ('width' in updates && updates.width !== undefined) || 
                           ('height' in updates && updates.height !== undefined) || 
                           ('radius' in updates && updates.radius !== undefined) ||
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
      // TODO (Phase 1 - Circle/Triangle/Line/Text): Refactor canvas.service.ts to accept Shape union type
      // For now, using 'as any' cast since we only have rectangles and dev is working
      await canvasService.updateRectangle(id, updates as any);
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
    
    // Sync selection state to RTDB (ephemeral)
    if (user) {
      if (id === null) {
        clearSelection(user.userId);
      } else {
        setSelection(user.userId, id);
      }
    }
  };

  // Z-index operations
  const bringToFront = (id: string) => {
    setCanvasState(prev => {
      const targetRect = prev.rectangles.find(rect => rect.id === id);
      if (!targetRect) return prev;

      const maxZIndex = Math.max(...prev.rectangles.map(r => r.zIndex), 0);
      if (targetRect.zIndex === maxZIndex) return prev; // Already at front

      // Simply set to maxZIndex + 1 (higher = front)
      const updatedRectangles = prev.rectangles.map(rect =>
        rect.id === id 
          ? { ...rect, zIndex: maxZIndex + 1 }
          : rect
      );

      return { ...prev, rectangles: updatedRectangles };
    });
  };

  const sendToBack = (id: string) => {
    setCanvasState(prev => {
      const targetRect = prev.rectangles.find(rect => rect.id === id);
      if (!targetRect) return prev;

      const minZIndex = Math.min(...prev.rectangles.map(r => r.zIndex), 1);
      if (targetRect.zIndex === minZIndex) return prev; // Already at back

      // Simply set to minZIndex - 1 (lower = back)
      const updatedRectangles = prev.rectangles.map(rect =>
        rect.id === id 
          ? { ...rect, zIndex: Math.max(1, minZIndex - 1) } // Ensure stays >= 1
          : rect
      );

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
              ? { ...rect, lastModified: new Date(), lastModifiedBy: user.email } // FIX: use email, not userId
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
    
    // Shape operations
    addRectangle,
    addCircle,
    addTriangle,
    addLine,
    addText,
    addRectangleFull,
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
