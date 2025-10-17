import React, { createContext, useState, ReactNode, useCallback } from 'react';
import { Shape } from '../types/canvas.types';
import * as canvasService from '../services/canvas.service';
import toast from 'react-hot-toast';

type ActionType = 'create' | 'delete' | 'modify' | 'move' | 'reorder';

export interface UndoAction {
  type: ActionType;
  timestamp: number;
  userId: string;
  shapeIds: string[];
  before: Shape | Shape[] | null;
  after: Shape | Shape[] | null;
}


interface UndoContextType {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  pushUndo: (action: UndoAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  setUndoStack: React.Dispatch<React.SetStateAction<UndoAction[]>>;
  setRedoStack: React.Dispatch<React.SetStateAction<UndoAction[]>>;
}

export const UndoContext = createContext<UndoContextType | undefined>(undefined);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const MAX_STACK_SIZE = 50;

  const pushUndo = useCallback((action: UndoAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      if (newStack.length > MAX_STACK_SIZE) {
        newStack.shift(); // Remove oldest
      }
      return newStack;
    });
    setRedoStack([]); // Clear redo stack when new action is performed
  }, []);

  const applyInverseAction = useCallback(async (action: UndoAction) => {
    try {
      switch (action.type) {
        case 'create':
          // Undo create = delete
          if (action.after && Array.isArray(action.after)) {
            for (const shape of action.after) {
              await canvasService.deleteRectangle(shape.id);
            }
          } else if (action.after && !Array.isArray(action.after)) {
            await canvasService.deleteRectangle(action.after.id);
          }
          break;
        
        case 'delete':
          // Undo delete = recreate
          if (action.before && Array.isArray(action.before)) {
            for (const shape of action.before) {
              await canvasService.createRectangle(shape as any);
            }
          } else if (action.before && !Array.isArray(action.before)) {
            await canvasService.createRectangle(action.before as any);
          }
          break;
        
        case 'modify':
        case 'move':
        case 'reorder':
          // Restore previous state
          if (action.before && !Array.isArray(action.before)) {
            await canvasService.updateRectangle(action.before.id, action.before as any);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to apply inverse action:', error);
      toast.error('Failed to undo action');
    }
  }, []);

  const applyAction = useCallback(async (action: UndoAction) => {
    try {
      switch (action.type) {
        case 'create':
          // Redo create = create the shapes
          if (action.after && Array.isArray(action.after)) {
            for (const shape of action.after) {
              await canvasService.createRectangle(shape as any);
            }
          } else if (action.after && !Array.isArray(action.after)) {
            await canvasService.createRectangle(action.after as any);
          }
          break;
        
        case 'delete':
          // Redo delete = delete the shapes that are currently visible (recreated by undo)
          // We need to delete by the current shape IDs since the shapes were recreated with new IDs
          // The action.before contains the original shapes, but we need to find their current IDs
          // For now, we'll use a simpler approach: store the recreated shape IDs in the action
          if (action.shapeIds && action.shapeIds.length > 0) {
            // If we have current shape IDs (stored during undo), use those
            for (const shapeId of action.shapeIds) {
              await canvasService.deleteRectangle(shapeId);
            }
          } else if (action.before && Array.isArray(action.before)) {
            // Fallback: try to delete by original IDs (this might not work if shapes were recreated)
            for (const shape of action.before) {
              try {
                await canvasService.deleteRectangle(shape.id);
              } catch (error) {
                console.warn(`Could not delete shape ${shape.id} during redo - it may have been recreated with a new ID`);
              }
            }
          } else if (action.before && !Array.isArray(action.before)) {
            // Single shape case
            try {
              await canvasService.deleteRectangle(action.before.id);
            } catch (error) {
              console.warn(`Could not delete shape ${action.before.id} during redo - it may have been recreated with a new ID`);
            }
          }
          break;
        
        case 'modify':
        case 'move':
        case 'reorder':
          // Redo modify/move/reorder = apply the after state
          if (action.after && !Array.isArray(action.after)) {
            await canvasService.updateRectangle(action.after.id, action.after as any);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to apply action:', error);
      toast.error('Failed to redo action');
    }
  }, []);

  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;
    
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
    
    // Apply inverse action
    await applyInverseAction(action);
    
    toast.success(`Undid ${action.type} operation`);
  }, [undoStack, applyInverseAction]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;
    
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    
    // Reapply action
    await applyAction(action);
    
    toast.success(`Redid ${action.type} operation`);
  }, [redoStack, applyAction]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return (
    <UndoContext.Provider value={{ 
      undoStack, 
      redoStack, 
      pushUndo, 
      undo, 
      redo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      clearHistory,
      setUndoStack,
      setRedoStack
    }}>
      {children}
    </UndoContext.Provider>
  );
}

// Custom hook to use undo context
export function useUndo() {
  const context = React.useContext(UndoContext);
  if (context === undefined) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}
