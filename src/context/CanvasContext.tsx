// Canvas Context with React Context API and Firestore integration
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Rectangle, TriangleShape, Shape, CanvasState, Viewport, Tool } from '../types/canvas.types';
import { MIN_ZOOM, MAX_ZOOM, DEFAULT_COLOR } from '../utils/constants';
import { autoUpdateZIndex, manualSetZIndex } from '../services/zIndex.service';
import { useAuth } from '../hooks/useAuth';
import * as canvasService from '../services/canvas.service';
import { setLiveSelection, clearLiveSelection } from '../services/liveSelections.service';
import { getCursorColorForUser } from '../services/cursor.service';
import { clearActiveEdit } from '../services/activeEdits.service';
import { setLivePosition, clearLivePosition } from '../services/livePositions.service';
import { clipboardService } from '../services/clipboard.service';
import { useUndo } from './UndoContext';
import toast from 'react-hot-toast';

interface CanvasContextType {
  // State
  rectangles: Shape[]; // Now stores all shape types
  viewport: Viewport;
  selectedIds: string[]; // NEW: Array of selected shape IDs
  currentTool: Tool;
  loading: boolean;
  error: string | null;
  stageSize: { width: number; height: number };
  cursorPosition: { x: number; y: number } | null;
  defaultColor: string; // NEW: Default color for new shapes
  defaultOpacity: number; // NEW: Default opacity for new shapes
  
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
  updateShape: (id: string, updates: Partial<Shape>, trackUndo?: boolean) => void;
  deleteRectangle: (id: string) => void;
  setSelectedRectangle: (id: string | null) => void; // Legacy method for backward compatibility
  selectShape: (id: string) => void; // NEW: Add shape to selection
  deselectShape: (id: string) => void; // NEW: Remove shape from selection
  selectAll: () => void; // NEW: Select all shapes
  deselectAll: () => void; // NEW: Clear all selections
  toggleSelection: (id: string) => void; // NEW: Toggle shape selection
  
  // Z-index operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  setZIndex: (id: string, zIndex: number) => void;
  batchSetZIndex: (updates: Record<string, number>) => Promise<void>;
  
  // Copy/Paste operations
  copyShapes: () => void;
  pasteShapes: () => void;
  duplicateShapes: () => void;
  
  // Delete operations
  deleteSelected: () => void;
  
  // Undo/Redo operations
  undoAction: () => void;
  redoAction: () => void;
  
  // Tool operations
  setTool: (tool: Tool) => void;
  
  // Utility
  clearError: () => void;
  setStageSize: (size: { width: number; height: number }) => void;
  updateCursorPosition: (x: number, y: number) => void;
  
  // Default color operations
  setDefaultColor: (color: string, opacity: number) => void;
}

export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

interface CanvasProviderProps {
  children: ReactNode;
}

// Helper function to remove undefined values from an object
// Firestore does not accept undefined values
function removeUndefinedFields(obj: any): any {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { pushUndo, undoStack, redoStack, setUndoStack, setRedoStack } = useUndo();
  const [canvasState, setCanvasState] = useState<CanvasState>({
    rectangles: [],
    viewport: { x: 0, y: 0, scale: 1 },
    selectedIds: [], // NEW: Array of selected shape IDs
    currentTool: 'select',
    loading: true, // Start with loading true while fetching from Firestore
    error: null,
    stageSize: { width: 800, height: 600 }, // Default size, will be updated by Canvas component
    cursorPosition: null // Initialize cursor position as null
  });
  
  // Default color state for new shapes
  const [defaultColor, setDefaultColorState] = useState<string>(DEFAULT_COLOR);
  const [defaultOpacity, setDefaultOpacityState] = useState<number>(1);

  // Subscribe to Firestore real-time updates
  useEffect(() => {
    const unsubscribe = canvasService.subscribeToShapes((shapes) => {
      setCanvasState(prev => {
        let newSelectedIds = [...prev.selectedIds];
        
        // If we have temp IDs selected and new real shapes came in, 
        // find if the new shapes match and update selection to the real IDs
        const tempIds = newSelectedIds.filter(id => id.startsWith('temp-'));
        if (tempIds.length > 0) {
          // Process each temp ID
          for (const tempId of tempIds) {
            const tempShape = prev.rectangles.find(r => r.id === tempId);
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
                // Replace temp ID with real ID
                const tempIndex = newSelectedIds.indexOf(tempId);
                if (tempIndex !== -1) {
                  newSelectedIds[tempIndex] = matchingShape.id;
                }
              }
            }
          }
        }
        
        return {
          ...prev,
          rectangles: shapes,
          selectedIds: newSelectedIds,
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

    // Calculate middle-left of viewport accounting for properties panel (288px = w-72)
    const canvasVisibleWidth = canvasState.stageSize.width;
    const canvasVisibleHeight = canvasState.stageSize.height;
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    
    // Position at middle-left: 1/4 from left edge, vertically centered but slightly higher
    const availableWidth = canvasVisibleWidth - propertiesPanelWidth;
    const baseCenterX = -canvasState.viewport.x / canvasState.viewport.scale + (availableWidth / 4) / canvasState.viewport.scale;
    const baseCenterY = -canvasState.viewport.y / canvasState.viewport.scale + (canvasVisibleHeight / 2.5) / canvasState.viewport.scale;

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
      color: defaultColor,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Simplified addCircle for toolbar (creates circle at viewport middle-left with smart offset)
  const addCircle = () => {
    if (!user?.email) return;

    // Calculate visible canvas middle-left accounting for properties panel (288px = w-72)
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    const availableWidth = canvasState.stageSize.width - propertiesPanelWidth;
    const baseCenterX = (-canvasState.viewport.x + (availableWidth / 4)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2.5)) / canvasState.viewport.scale;

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
      color: defaultColor,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Full addCircle API
  const addCircleFull = async (circle: Omit<import('../types/canvas.types').CircleShape, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    // Optimistic update: add to local state immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let newCircle!: import('../types/canvas.types').CircleShape;
    setCanvasState(prev => {
      // Calculate highest z-index + 1 for new circle (higher = front)
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      newCircle = {
        ...circle,
        type: 'circle',
        id: tempId,
        rotation: 0, // Default rotation
        opacity: 1, // Default opacity
        visible: true, // Default visible
        locked: false, // Default unlocked
        zIndex: maxZIndex + 1, // New circle goes to front
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newCircle],
        selectedIds: [newCircle.id] // Auto-select newly created circle
      };
    });

    // Add undo tracking for create operation (capture immediately after local state update)
    if (user) {
      pushUndo({
        type: 'create',
        timestamp: Date.now(),
        userId: user.userId,
        shapeIds: [tempId],
        before: null,
        after: newCircle
      });
    }

    // Broadcast selection to other users
    if (user) {
      const cursorColorData = getCursorColorForUser(user.email);
      setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], [tempId], cursorColorData.cursorColor);
    }

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
      // Revert optimistic update on failure
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedIds: prev.selectedIds.filter(id => id !== tempId)
      }));
    }
  };

  // Simplified addTriangle for toolbar (creates triangle at viewport center with smart offset)
  const addTriangle = () => {
    if (!user?.email) return;

    // Calculate visible canvas middle-left accounting for properties panel (288px = w-72)
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    const availableWidth = canvasState.stageSize.width - propertiesPanelWidth;
    const baseCenterX = (-canvasState.viewport.x + (availableWidth / 4)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2.5)) / canvasState.viewport.scale;

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
      color: defaultColor,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Full addTriangle API
  const addTriangleFull = async (triangle: Omit<TriangleShape, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let newTriangle!: TriangleShape;
    setCanvasState(prev => {
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      newTriangle = {
        ...triangle,
        type: 'triangle',
        id: tempId,
        rotation: 0,
        opacity: 1,
        visible: true, // Default visible
        locked: false, // Default unlocked
        zIndex: maxZIndex + 1,
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newTriangle],
        selectedIds: [newTriangle.id]
      };
    });

    // Add undo tracking for create operation (capture immediately after local state update)
    if (user) {
      pushUndo({
        type: 'create',
        timestamp: Date.now(),
        userId: user.userId,
        shapeIds: [tempId],
        before: null,
        after: newTriangle
      });
    }

    // Broadcast selection to other users
    if (user) {
      const cursorColorData = getCursorColorForUser(user.email);
      setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], [tempId], cursorColorData.cursorColor);
    }

    try {
      const fullTriangle = {
        ...triangle,
        type: 'triangle' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullTriangle as any);
    } catch (error) {
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedIds: prev.selectedIds.filter(id => id !== tempId)
      }));
    }
  };

  // Simplified addLine for toolbar (creates line at viewport center with smart offset)
  const addLine = () => {
    if (!user?.email) return;

    // Calculate visible canvas middle-left accounting for properties panel (288px = w-72)
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    const availableWidth = canvasState.stageSize.width - propertiesPanelWidth;
    const baseCenterX = (-canvasState.viewport.x + (availableWidth / 4)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2.5)) / canvasState.viewport.scale;

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
      color: defaultColor,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  const addText = () => {
    if (!user?.email) return;

    // Calculate visible canvas middle-left accounting for properties panel (288px = w-72)
    const propertiesPanelWidth = 288; // w-72 in Tailwind
    const availableWidth = canvasState.stageSize.width - propertiesPanelWidth;
    const baseCenterX = (-canvasState.viewport.x + (availableWidth / 4)) / canvasState.viewport.scale;
    const baseCenterY = (-canvasState.viewport.y + (canvasState.stageSize.height / 2.5)) / canvasState.viewport.scale;

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
      color: defaultColor,
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
    
    let newLine!: import('../types/canvas.types').LineShape;
    setCanvasState(prev => {
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      newLine = {
        ...line,
        type: 'line',
        id: tempId,
        rotation: 0,
        opacity: 1,
        visible: true, // Default visible
        locked: false, // Default unlocked
        zIndex: maxZIndex + 1,
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newLine],
        selectedIds: [newLine.id]
      };
    });

    // Add undo tracking for create operation (capture immediately after local state update)
    if (user) {
      pushUndo({
        type: 'create',
        timestamp: Date.now(),
        userId: user.userId,
        shapeIds: [tempId],
        before: null,
        after: newLine
      });
    }

    // Broadcast selection to other users
    if (user) {
      const cursorColorData = getCursorColorForUser(user.email);
      setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], [tempId], cursorColorData.cursorColor);
    }

    try {
      const fullLine = {
        ...line,
        type: 'line' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullLine as any);
    } catch (error) {
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedIds: prev.selectedIds.filter(id => id !== tempId)
      }));
    }
  };

  // Full addText API
  const addTextFull = async (text: Omit<import('../types/canvas.types').TextShape, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let newText!: import('../types/canvas.types').TextShape;
    setCanvasState(prev => {
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      newText = {
        ...text,
        type: 'text',
        id: tempId,
        rotation: 0,
        opacity: 1,
        visible: true, // Default visible
        locked: false, // Default unlocked
        zIndex: maxZIndex + 1,
        createdAt: new Date(),
        lastModified: new Date()
      };
      return {
        ...prev,
        rectangles: [...prev.rectangles, newText],
        selectedIds: [newText.id]
      };
    });

    // Add undo tracking for create operation (capture immediately after local state update)
    if (user) {
      pushUndo({
        type: 'create',
        timestamp: Date.now(),
        userId: user.userId,
        shapeIds: [tempId],
        before: null,
        after: newText
      });
    }

    // Broadcast selection to other users
    if (user) {
      const cursorColorData = getCursorColorForUser(user.email);
      setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], [tempId], cursorColorData.cursorColor);
    }

    try {
      const fullText = {
        ...text,
        type: 'text' as const,
        rotation: 0,
        opacity: 1
      };
      await canvasService.createRectangle(fullText as any); // TODO: Update service to accept Shape
    } catch (error) {
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedIds: prev.selectedIds.filter(id => id !== tempId)
      }));
    }
  };

  // Full addRectangle for backward compatibility and tests
  const addRectangleFull = async (rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified' | 'type' | 'rotation' | 'opacity'>) => {
    // Optimistic update: add to local state immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let newRectangle!: Rectangle;
    setCanvasState(prev => {
      // Calculate highest z-index + 1 for new rectangle (higher = front)
      const maxZIndex = prev.rectangles.length > 0 
        ? Math.max(...prev.rectangles.map(r => r.zIndex)) 
        : 0;
      
      newRectangle = {
        ...rectangle,
        type: 'rectangle',
        id: tempId,
        rotation: 0, // Default rotation
        opacity: 1, // Default opacity
        visible: true, // Default visible
        locked: false, // Default unlocked
        zIndex: maxZIndex + 1, // New rectangle goes to front
        createdAt: new Date(),
        lastModified: new Date()
      };

      return {
        ...prev,
        rectangles: [...prev.rectangles, newRectangle],
        selectedIds: [newRectangle.id] // Auto-select newly created rectangle
      };
    });

    // Add undo tracking for create operation (capture immediately after local state update)
    if (user) {
      pushUndo({
        type: 'create',
        timestamp: Date.now(),
        userId: user.userId,
        shapeIds: [tempId],
        before: null,
        after: newRectangle
      });
    }

    // Broadcast selection to other users
    if (user) {
      const cursorColorData = getCursorColorForUser(user.email);
      setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], [tempId], cursorColorData.cursorColor);
    }

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
      // Revert optimistic update on failure
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => r.id !== tempId),
        selectedIds: prev.selectedIds.filter(id => id !== tempId)
      }));
    }
  };

  const updateShape = async (id: string, updates: Partial<Shape>, trackUndo: boolean = true) => {
    // Capture before state for undo (for all operations)
    const beforeShape = canvasState.rectangles.find(rect => rect.id === id);
    const isMoveOperation = updates.x !== undefined || updates.y !== undefined;
    
    // Check for resize operations using type-safe property access
    const isResizeOperation = 
      ('width' in updates && updates.width !== undefined) ||
      ('height' in updates && updates.height !== undefined) ||
      ('radius' in updates && updates.radius !== undefined) ||
      ('x2' in updates && updates.x2 !== undefined) ||
      ('y2' in updates && updates.y2 !== undefined);
    
    const isModifyOperation = isMoveOperation || isResizeOperation || updates.color !== undefined || updates.opacity !== undefined || updates.rotation !== undefined;
    
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

      // Auto-move to front when editing position, size, or color (but NOT when zIndex is explicitly set)
      const isEditAction = (updates.x !== undefined || updates.y !== undefined || 
                           ('width' in updates && updates.width !== undefined) || 
                           ('height' in updates && updates.height !== undefined) || 
                           ('radius' in updates && updates.radius !== undefined) ||
                           updates.color !== undefined) && updates.zIndex === undefined;
      
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
      // If z-index is being updated, use updateZIndex which handles cascading updates
      if (updates.zIndex !== undefined) {
        await canvasService.updateZIndex(id, updates.zIndex);
        
        // If there are other updates besides z-index, apply them separately
        const { zIndex, ...otherUpdates } = updates;
        if (Object.keys(otherUpdates).length > 0) {
          await canvasService.updateRectangle(id, otherUpdates as any);
        }
      } else {
        // Normal update for non-zIndex changes
        await canvasService.updateRectangle(id, updates as any);
      }
      
      // Add undo tracking for all modify operations (only if trackUndo is true)
      if (trackUndo && isModifyOperation && beforeShape && user) {
        const afterShape = { ...beforeShape, ...updates } as Shape;
        const actionType = isMoveOperation ? 'move' : isResizeOperation ? 'modify' : 'modify';
        pushUndo({
          type: actionType,
          timestamp: Date.now(),
          userId: user.userId,
          shapeIds: [id],
          before: beforeShape,
          after: afterShape
        });
      }
    } catch (error) {
      // The Firestore listener will eventually sync the correct state
    }
  };

  const deleteRectangle = async (id: string) => {
    // Optimistic update: remove from local state immediately
    setCanvasState(prev => ({
      ...prev,
      rectangles: prev.rectangles.filter(rect => rect.id !== id),
      selectedIds: prev.selectedIds.filter(selectedId => selectedId !== id)
    }));

    // Sync to Firestore in background
    try {
      await canvasService.deleteRectangle(id);
    } catch (error) {
      // The Firestore listener will eventually sync the correct state
    }
  };

  const setSelectedRectangle = (id: string | null) => {
    // Legacy method: convert single selection to array format
    const selectedIds = id ? [id] : [];
    setCanvasState(prev => ({ ...prev, selectedIds }));
    
    // Sync selection state to RTDB (ephemeral)
    if (user) {
      if (id === null) {
        clearLiveSelection(user.userId);
      } else {
        const cursorColorData = getCursorColorForUser(user.email);
        setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], [id], cursorColorData.cursorColor);
      }
    }
  };

  // NEW: Multi-selection methods
  const selectShape = (id: string) => {
    setCanvasState(prev => {
      if (prev.selectedIds.includes(id)) return prev; // Already selected
      const newSelectedIds = [...prev.selectedIds, id];
      
      // Sync selection state to RTDB (ephemeral)
      if (user) {
        const cursorColorData = getCursorColorForUser(user.email);
        setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], newSelectedIds, cursorColorData.cursorColor);
      }
      
      return { ...prev, selectedIds: newSelectedIds };
    });
  };

  const deselectShape = (id: string) => {
    setCanvasState(prev => {
      const newSelectedIds = prev.selectedIds.filter(selectedId => selectedId !== id);
      
      // Sync selection state to RTDB (ephemeral)
      if (user) {
        if (newSelectedIds.length === 0) {
          clearLiveSelection(user.userId);
        } else {
          const cursorColorData = getCursorColorForUser(user.email);
          setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], newSelectedIds, cursorColorData.cursorColor);
        }
      }
      
      return {
        ...prev,
        selectedIds: newSelectedIds
      };
    });
  };

  const selectAll = () => {
    setCanvasState(prev => {
      const newSelectedIds = prev.rectangles.map(shape => shape.id);
      
      // Sync selection state to RTDB (ephemeral)
      if (user && newSelectedIds.length > 0) {
        const cursorColorData = getCursorColorForUser(user.email);
        setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], newSelectedIds, cursorColorData.cursorColor);
      }
      
      return {
        ...prev,
        selectedIds: newSelectedIds
      };
    });
  };

  const deselectAll = () => {
    setCanvasState(prev => ({ ...prev, selectedIds: [] }));
    
    // Sync selection state to RTDB (ephemeral)
    if (user) {
      clearLiveSelection(user.userId);
    }
  };

  const toggleSelection = (id: string) => {
    setCanvasState(prev => {
      const isSelected = prev.selectedIds.includes(id);
      const newSelectedIds = isSelected 
        ? prev.selectedIds.filter(selectedId => selectedId !== id)
        : [...prev.selectedIds, id];
      
      // Sync selection state to RTDB (ephemeral) - use the new state
      if (user) {
        if (newSelectedIds.length === 0) {
          clearLiveSelection(user.userId);
        } else {
          const cursorColorData = getCursorColorForUser(user.email);
          setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], newSelectedIds, cursorColorData.cursorColor);
        }
      }
      
      return {
        ...prev,
        selectedIds: newSelectedIds
      };
    });
  };

  // Copy/Paste operations
  const copyShapes = () => {
    const selected = canvasState.rectangles.filter(r => canvasState.selectedIds.includes(r.id));
    if (selected.length === 0) {
      toast.error('No shapes selected to copy');
      return;
    }
    
    clipboardService.copyShapes(selected);
    toast.success(`Copied ${selected.length} shape(s)`);
  };

  const pasteShapes = async () => {
    if (!clipboardService.hasClipboard()) {
      toast.error('Nothing to paste');
      return;
    }
    
    if (!user) {
      toast.error('Must be logged in to paste');
      return;
    }
    
    // Use cursor position if available, otherwise use default offset
    const cursorX = canvasState.cursorPosition?.x;
    const cursorY = canvasState.cursorPosition?.y;
    const newShapes = clipboardService.pasteShapes(cursorX, cursorY);
    
    // Calculate max z-index for new shapes
    const maxZIndex = canvasState.rectangles.length > 0 
      ? Math.max(...canvasState.rectangles.map(r => r.zIndex)) 
      : 0;
    
    // Set proper metadata for new shapes
    const shapesWithMetadata = newShapes.map((shape, index) => ({
      ...shape,
      zIndex: maxZIndex + 1 + index, // Each pasted shape gets a higher z-index
      createdBy: user.email,
      lastModifiedBy: user.email
    }));
    
    // Optimistic update
    setCanvasState(prev => ({
      ...prev,
      rectangles: [...prev.rectangles, ...shapesWithMetadata],
      selectedIds: shapesWithMetadata.map(s => s.id)
    }));

    // Broadcast selection to other users
    if (user && shapesWithMetadata.length > 0) {
      const cursorColorData = getCursorColorForUser(user.email);
      setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], shapesWithMetadata.map(s => s.id), cursorColorData.cursorColor);
    }
    
    // Persist to Firestore
    try {
      for (const shape of shapesWithMetadata) {
        await canvasService.createRectangle(shape as any); // TODO: Update service to accept Shape
      }
      toast.success(`Pasted ${shapesWithMetadata.length} shape(s)`);
    } catch (error) {
      toast.error('Failed to paste shapes');
      // Revert optimistic update on failure
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => !shapesWithMetadata.some(s => s.id === r.id)),
        selectedIds: []
      }));
    }
  };

  const duplicateShapes = async () => {
    const selected = canvasState.rectangles.filter(r => canvasState.selectedIds.includes(r.id));
    if (selected.length === 0) {
      toast.error('No shapes selected to duplicate');
      return;
    }
    
    if (!user) {
      toast.error('Must be logged in to duplicate');
      return;
    }
    
    // Create duplicates with +20px offset and new IDs
    const duplicates = selected.map((shape, index) => ({
      ...shape,
      id: 'temp-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
      x: shape.x + 20,
      y: shape.y + 20,
      zIndex: (canvasState.rectangles.length > 0 ? Math.max(...canvasState.rectangles.map(r => r.zIndex)) : 0) + 1 + index,
      createdBy: user.email,
      createdAt: new Date(),
      lastModifiedBy: user.email,
      lastModified: new Date()
    }));
    
    // Optimistic update
    setCanvasState(prev => ({
      ...prev,
      rectangles: [...prev.rectangles, ...duplicates],
      selectedIds: duplicates.map(s => s.id)
    }));

    // Broadcast selection to other users
    if (user && duplicates.length > 0) {
      const cursorColorData = getCursorColorForUser(user.email);
      setLiveSelection(user.userId, user.email, user.firstName || user.email.split('@')[0], duplicates.map(s => s.id), cursorColorData.cursorColor);
    }
    
    // Persist to Firestore
    try {
      for (const shape of duplicates) {
        await canvasService.createRectangle(shape as any); // TODO: Update service to accept Shape
      }
      toast.success(`Duplicated ${duplicates.length} shape(s)`);
    } catch (error) {
      toast.error('Failed to duplicate shapes');
      // Revert optimistic update on failure
      setCanvasState(prev => ({
        ...prev,
        rectangles: prev.rectangles.filter(r => !duplicates.some(s => s.id === r.id)),
        selectedIds: []
      }));
    }
  };

  const deleteSelected = async () => {
    if (canvasState.selectedIds.length === 0) {
      toast.error('No shapes selected to delete');
      return;
    }
    
    if (!user) {
      toast.error('Must be logged in to delete shapes');
      return;
    }
    
    const selectedCount = canvasState.selectedIds.length;
    const shapesToDelete = canvasState.rectangles.filter(r => canvasState.selectedIds.includes(r.id));
    
    // Capture undo action BEFORE deleting
    pushUndo({
      type: 'delete',
      timestamp: Date.now(),
      userId: user.userId,
      shapeIds: canvasState.selectedIds,
      before: shapesToDelete,
      after: null
    });
    
    // Delete all selected shapes
    const deletePromises = canvasState.selectedIds.map(id => deleteRectangle(id));
    
    try {
      await Promise.all(deletePromises);
      toast.success(`Deleted ${selectedCount} shape(s)`);
    } catch (error) {
      toast.error('Failed to delete some shapes');
    }
  };

  // Undo/Redo functions that work with current canvas state
  const undoAction = async () => {
    if (undoStack.length === 0) return;
    
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    // Create a modified action for redo that includes the current shape IDs
    const redoAction = { ...action };
    
    try {
      switch (action.type) {
        case 'create':
          // Undo create = delete the created shapes
          if (action.after && Array.isArray(action.after)) {
            const currentShapeIds: string[] = [];
            for (const shape of action.after) {
              // Find the current shape by matching properties since ID might have changed
              const currentShape = canvasState.rectangles.find(s => 
                s.type === shape.type && 
                s.x === shape.x && 
                s.y === shape.y && 
                s.color === shape.color &&
                ((s.type === 'rectangle' && (s as any).width === (shape as any).width && (s as any).height === (shape as any).height) ||
                 (s.type === 'circle' && (s as any).radius === (shape as any).radius) ||
                 (s.type === 'line' && (s as any).x2 === (shape as any).x2 && (s as any).y2 === (shape as any).y2) ||
                 (s.type === 'text' && (s as any).text === (shape as any).text) ||
                 (s.type === 'triangle' && (s as any).width === (shape as any).width && (s as any).height === (shape as any).height))
              );
              
              if (currentShape) {
                currentShapeIds.push(currentShape.id);
                await deleteRectangle(currentShape.id);
              }
            }
            // Store current shape IDs for redo
            redoAction.shapeIds = currentShapeIds;
          } else if (action.after && !Array.isArray(action.after)) {
            const shape = action.after;
            // Find the current shape by matching properties
            const currentShape = canvasState.rectangles.find(s => 
              s.type === shape.type && 
              s.x === shape.x && 
              s.y === shape.y && 
              s.color === shape.color &&
              ((s.type === 'rectangle' && (s as any).width === (shape as any).width && (s as any).height === (shape as any).height) ||
               (s.type === 'circle' && (s as any).radius === (shape as any).radius) ||
               (s.type === 'line' && (s as any).x2 === (shape as any).x2 && (s as any).y2 === (shape as any).y2) ||
               (s.type === 'text' && (s as any).text === (shape as any).text) ||
               (s.type === 'triangle' && (s as any).width === (shape as any).width && (s as any).height === (shape as any).height))
            );
            
            if (currentShape) {
              redoAction.shapeIds = [currentShape.id];
              await deleteRectangle(currentShape.id);
            }
          }
          break;
        
        case 'delete':
          // Undo delete = recreate the deleted shapes
          if (action.before && Array.isArray(action.before)) {
            for (const shape of action.before) {
              // Remove undefined fields before recreating (Firestore doesn't accept undefined values)
              const cleanedShape = removeUndefinedFields(shape);
              
              // Recreate the shape with the same properties
              if (cleanedShape.type === 'rectangle') {
                await addRectangleFull(cleanedShape as any);
              } else if (cleanedShape.type === 'circle') {
                await addCircleFull(cleanedShape as any);
              } else if (cleanedShape.type === 'triangle') {
                await addTriangleFull(cleanedShape as any);
              } else if (cleanedShape.type === 'line') {
                await addLineFull(cleanedShape as any);
              } else if (cleanedShape.type === 'text') {
                await addTextFull(cleanedShape as any);
              }
            }
          } else if (action.before && !Array.isArray(action.before)) {
            // Remove undefined fields before recreating (Firestore doesn't accept undefined values)
            const cleanedShape = removeUndefinedFields(action.before);
            
            if (cleanedShape.type === 'rectangle') {
              await addRectangleFull(cleanedShape as any);
            } else if (cleanedShape.type === 'circle') {
              await addCircleFull(cleanedShape as any);
            } else if (cleanedShape.type === 'triangle') {
              await addTriangleFull(cleanedShape as any);
            } else if (cleanedShape.type === 'line') {
              await addLineFull(cleanedShape as any);
            } else if (cleanedShape.type === 'text') {
              await addTextFull(cleanedShape as any);
            }
          }
          // For redo, we'll find the recreated shapes by matching properties
          // This is more reliable than trying to track IDs through the creation process
          break;
        
        case 'modify':
        case 'move':
        case 'reorder':
          // Restore previous state
          if (action.before && !Array.isArray(action.before)) {
            await updateShape(action.before.id, action.before as any, false); // Don't track undo for this update
          }
          break;
      }
      
      // Add the modified action to redo stack
      setRedoStack(prev => [...prev, redoAction]);
      
      toast.success(`Undid ${action.type} operation`);
    } catch (error) {
      toast.error('Failed to undo action');
      // Still add to redo stack even if there was an error
      setRedoStack(prev => [...prev, redoAction]);
    }
  };

  const redoAction = async () => {
    if (redoStack.length === 0) return;
    
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    
    try {
      switch (action.type) {
        case 'create':
          // Redo create = recreate the shapes
          if (action.after && Array.isArray(action.after)) {
            for (const shape of action.after) {
              // Remove undefined fields before recreating (Firestore doesn't accept undefined values)
              const cleanedShape = removeUndefinedFields(shape);
              
              if (cleanedShape.type === 'rectangle') {
                await addRectangleFull(cleanedShape as any);
              } else if (cleanedShape.type === 'circle') {
                await addCircleFull(cleanedShape as any);
              } else if (cleanedShape.type === 'triangle') {
                await addTriangleFull(cleanedShape as any);
              } else if (cleanedShape.type === 'line') {
                await addLineFull(cleanedShape as any);
              } else if (cleanedShape.type === 'text') {
                await addTextFull(cleanedShape as any);
              }
            }
          } else if (action.after && !Array.isArray(action.after)) {
            // Remove undefined fields before recreating (Firestore doesn't accept undefined values)
            const cleanedShape = removeUndefinedFields(action.after);
            
            if (cleanedShape.type === 'rectangle') {
              await addRectangleFull(cleanedShape as any);
            } else if (cleanedShape.type === 'circle') {
              await addCircleFull(cleanedShape as any);
            } else if (cleanedShape.type === 'triangle') {
              await addTriangleFull(cleanedShape as any);
            } else if (cleanedShape.type === 'line') {
              await addLineFull(cleanedShape as any);
            } else if (cleanedShape.type === 'text') {
              await addTextFull(cleanedShape as any);
            }
          }
          break;
        
        case 'delete':
          // Redo delete = delete the shapes that were recreated during undo
          // Find shapes by matching properties since they were recreated with new IDs
          if (action.before && Array.isArray(action.before)) {
            for (const originalShape of action.before) {
              // Find the current shape that matches the original shape's properties
              const currentShape = canvasState.rectangles.find(shape => {
                if (shape.type !== originalShape.type || 
                    shape.x !== originalShape.x || 
                    shape.y !== originalShape.y || 
                    shape.color !== originalShape.color) {
                  return false;
                }
                
                // Type-specific matching
                if (originalShape.type === 'rectangle' && shape.type === 'rectangle') {
                  return shape.width === originalShape.width && shape.height === originalShape.height;
                } else if (originalShape.type === 'circle' && shape.type === 'circle') {
                  return shape.radius === originalShape.radius;
                } else if (originalShape.type === 'line' && shape.type === 'line') {
                  return shape.x2 === originalShape.x2 && shape.y2 === originalShape.y2;
                } else if (originalShape.type === 'text' && shape.type === 'text') {
                  return shape.text === originalShape.text;
                } else if (originalShape.type === 'triangle' && shape.type === 'triangle') {
                  return shape.width === originalShape.width && shape.height === originalShape.height;
                }
                
                return true;
              });
              
              if (currentShape) {
                await deleteRectangle(currentShape.id);
              }
            }
          } else if (action.before && !Array.isArray(action.before)) {
            // Single shape case
            const originalShape = action.before;
            const currentShape = canvasState.rectangles.find(shape => {
              if (shape.type !== originalShape.type || 
                  shape.x !== originalShape.x || 
                  shape.y !== originalShape.y || 
                  shape.color !== originalShape.color) {
                return false;
              }
              
              // Type-specific matching
              if (originalShape.type === 'rectangle' && shape.type === 'rectangle') {
                return shape.width === originalShape.width && shape.height === originalShape.height;
              } else if (originalShape.type === 'circle' && shape.type === 'circle') {
                return shape.radius === originalShape.radius;
              } else if (originalShape.type === 'line' && shape.type === 'line') {
                return shape.x2 === originalShape.x2 && shape.y2 === originalShape.y2;
              } else if (originalShape.type === 'text' && shape.type === 'text') {
                return shape.text === originalShape.text;
              } else if (originalShape.type === 'triangle' && shape.type === 'triangle') {
                return shape.width === originalShape.width && shape.height === originalShape.height;
              }
              
              return true;
            });
            
            if (currentShape) {
              await deleteRectangle(currentShape.id);
            }
          }
          break;
        
        case 'modify':
        case 'move':
        case 'reorder':
          // Redo modify/move/reorder = apply the after state
          if (action.after && !Array.isArray(action.after)) {
            await updateShape(action.after.id, action.after as any, false); // Don't track undo for this update
          }
          break;
      }
      
      toast.success(`Redid ${action.type} operation`);
    } catch (error) {
      toast.error('Failed to redo action');
    }
  };

  // Z-index operations
  const bringToFront = async (id: string) => {
    const targetRect = canvasState.rectangles.find((rect: Shape) => rect.id === id);
    if (!targetRect) return;

    const maxZIndex = Math.max(...canvasState.rectangles.map((r: Shape) => r.zIndex), 0);
    if (targetRect.zIndex === maxZIndex) return; // Already at front

    const newZIndex = maxZIndex + 1;

    // Clear any active edit FIRST to prevent conflicts
    if (user?.userId) {
      await clearActiveEdit(id);
    }

    // Use updateShape for consistency with layers panel - this will update local state and Firestore
    try {
      await updateShape(id, { zIndex: newZIndex });
      toast.success('Brought to front');
    } catch (error) {
      console.error('[bringToFront] Failed to update z-index:', error);
      toast.error('Failed to bring to front');
      return;
    }
  };

  const sendToBack = async (id: string) => {
    const targetRect = canvasState.rectangles.find((rect: Shape) => rect.id === id);
    if (!targetRect) return;

    // Find the actual minimum z-index among all shapes (no fallback to 0)
    const zIndices = canvasState.rectangles.map((r: Shape) => r.zIndex);
    if (zIndices.length === 0) return; // No shapes to work with
    
    const minZIndex = Math.min(...zIndices);
    if (targetRect.zIndex === minZIndex) return; // Already at back

    const newZIndex = minZIndex - 1;

    // Clear any active edit FIRST to prevent conflicts
    if (user?.userId) {
      await clearActiveEdit(id);
    }

    // Use updateShape for consistency with layers panel - this will update local state and Firestore
    try {
      await updateShape(id, { zIndex: newZIndex });
      toast.success('Sent to back');
    } catch (error) {
      console.error('[sendToBack] Failed to update z-index:', error);
      toast.error('Failed to send to back');
      return;
    }
  };

  const setZIndex = async (id: string, zIndex: number) => {
    // Validate z-index range
    if (zIndex < -100000000 || zIndex > 100000000) {
      toast.error('Z-index must be between -100M and 100M');
      return;
    }

    // Use batch approach like layers panel to avoid "No document to update" errors
    const targetShape = canvasState.rectangles.find(s => s.id === id);
    if (!targetShape) {
      toast.error('Shape not found');
      return;
    }

    const oldZIndex = targetShape.zIndex;
    if (oldZIndex === zIndex) {
      toast('Z-index unchanged');
      return;
    }

    // Calculate all z-index updates using manualSetZIndex logic
    const updatedShapes = manualSetZIndex(canvasState.rectangles, id, zIndex);
    
    // Build updates map for all shapes that changed
    const zIndexUpdates: Record<string, number> = {};
    updatedShapes.forEach(shape => {
      const originalShape = canvasState.rectangles.find(s => s.id === shape.id);
      if (originalShape && originalShape.zIndex !== shape.zIndex) {
        zIndexUpdates[shape.id] = shape.zIndex;
      }
    });

    // Optimistic update: Update local state immediately
    setCanvasState(prev => ({
      ...prev,
      rectangles: updatedShapes
    }));

    // Batch update all z-indices in Firestore
    if (Object.keys(zIndexUpdates).length > 0) {
      try {
        await canvasService.batchUpdateZIndices(zIndexUpdates);
        toast.success(`Z-index set to ${zIndex}`);
      } catch (error) {
        console.error('Failed to update z-index:', error);
        toast.error('Failed to update z-index');
        // Revert optimistic update on error
        setCanvasState(prev => ({
          ...prev,
          rectangles: canvasState.rectangles
        }));
      }
    }
  };

  // Batch z-index update with optimistic local state updates
  const batchSetZIndex = async (updates: Record<string, number>): Promise<void> => {
    if (!user) return;
    
    // Apply updates optimistically to local state
    const updatedShapes = canvasState.rectangles.map(shape => {
      if (updates[shape.id] !== undefined) {
        return { ...shape, zIndex: updates[shape.id] };
      }
      return shape;
    });

    // Update local state immediately
    setCanvasState(prev => ({
      ...prev,
      rectangles: updatedShapes
    }));

    // Broadcast z-index changes to RTDB for instant visual updates
    for (const [shapeId, newZIndex] of Object.entries(updates)) {
      const shape = canvasState.rectangles.find(s => s.id === shapeId);
      if (shape) {
        // Broadcast the z-index change with current position/size data
        const width = 'width' in shape ? shape.width : ('radius' in shape ? shape.radius * 2 : 100);
        const height = 'height' in shape ? shape.height : ('radius' in shape ? shape.radius * 2 : 100);
        
        setLivePosition(
          shapeId,
          user.userId,
          shape.x,
          shape.y,
          width as number,
          height as number,
          newZIndex,
          'x2' in shape ? shape.x2 : undefined,
          'y2' in shape ? shape.y2 : undefined
        );
        
        // Clear the live position after a short delay to allow others to see the change
        setTimeout(() => {
          clearLivePosition(shapeId);
        }, 500);
      }
    }

    // Update Firestore
    try {
      await canvasService.batchUpdateZIndices(updates);
    } catch (error) {
      console.error('Failed to batch update z-indices:', error);
      // Revert optimistic update on error
      setCanvasState(prev => ({
        ...prev,
        rectangles: canvasState.rectangles
      }));
      throw error; // Re-throw so caller can handle
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

  const updateCursorPosition = (x: number, y: number) => {
    setCanvasState(prev => ({ ...prev, cursorPosition: { x, y } }));
  };

  const value: CanvasContextType = {
    // State
    rectangles: canvasState.rectangles,
    viewport: canvasState.viewport,
    selectedIds: canvasState.selectedIds,
    currentTool: canvasState.currentTool,
    loading: canvasState.loading,
    error: canvasState.error,
    stageSize: canvasState.stageSize,
    cursorPosition: canvasState.cursorPosition,
    defaultColor,
    defaultOpacity,
    
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
    updateShape,
    deleteRectangle,
    setSelectedRectangle,
    
    // NEW: Multi-selection methods
    selectShape,
    deselectShape,
    selectAll,
    deselectAll,
    toggleSelection,
    
    // Z-index operations
    bringToFront,
    sendToBack,
    setZIndex,
    batchSetZIndex,
    
    // Copy/Paste operations
    copyShapes,
    pasteShapes,
    duplicateShapes,
    
  // Delete operations
  deleteSelected,
  
  // Undo/Redo operations
  undoAction,
  redoAction,
  
  // Tool operations
  setTool,
    
  // Utility
  clearError,
  setStageSize,
  updateCursorPosition,
  
  // Default color operations
  setDefaultColor: (color: string, opacity: number) => {
    setDefaultColorState(color);
    setDefaultOpacityState(opacity);
  }
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
};
