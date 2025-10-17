/**
 * AI Context
 * 
 * Provides AI agent functionality to the application.
 * Orchestrates command execution, plan generation, and state management.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AIPlan, AIOperation, CanvasSnapshot } from '../types/ai-tools';
import { aiCanvasService, AIServiceError } from '../services/AICanvasService';
import { executePlan, CanvasContextMethods } from '../utils/aiPlanExecutor';
import { useCanvas } from './CanvasContext';
import toast from 'react-hot-toast';

/**
 * AI Context Type
 */
interface AIContextType {
  // State
  isProcessing: boolean;
  lastPlan: AIPlan | null;
  error: Error | null;
  progress: {
    current: number;
    total: number;
    operation?: AIOperation;
  } | null;

  // Methods
  executeCommand: (prompt: string) => Promise<void>;
  clearError: () => void;
}

/**
 * AI Context
 */
const AIContext = createContext<AIContextType | undefined>(undefined);

/**
 * AI Provider Props
 */
interface AIProviderProps {
  children: ReactNode;
}

/**
 * AI Provider
 */
export function AIProvider({ children }: AIProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPlan, setLastPlan] = useState<AIPlan | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    operation?: AIOperation;
  } | null>(null);

  const canvasContext = useCanvas();

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get current canvas snapshot for AI
   */
  const getCanvasSnapshot = useCallback((): CanvasSnapshot => {
    const shapes = canvasContext.rectangles.map(shape => ({
      id: shape.id,
      type: shape.type as any,
      name: shape.name,
      x: shape.x,
      y: shape.y,
      width: (shape as any).width,
      height: (shape as any).height,
      radius: (shape as any).radius,
      x2: (shape as any).x2,
      y2: (shape as any).y2,
      color: shape.color,
      opacity: shape.opacity || 1,
      rotation: shape.rotation || 0,
      zIndex: shape.zIndex,
      visible: shape.visible !== false,
      locked: shape.locked || false,
    }));

    return {
      shapes,
      canvasWidth: 5000,
      canvasHeight: 5000,
      selectedIds: canvasContext.selectedIds || [],
    };
  }, [canvasContext.rectangles, canvasContext.selectedIds]);

  /**
   * Execute an AI command
   */
  const executeCommand = useCallback(async (prompt: string) => {
    if (!prompt || prompt.trim().length === 0) {
      toast.error('Please enter a command');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(null);

    try {
      // Get current canvas state
      const canvasSnapshot = getCanvasSnapshot();

      // Request plan from AI
      const plan = await aiCanvasService.requestPlan(prompt, canvasSnapshot);
      setLastPlan(plan);

      // Check if AI needs clarification
      if (plan.needsClarification) {
        toast.error(plan.needsClarification.question);
        setIsProcessing(false);
        return;
      }

      // Determine execution mode
      const shouldExecuteServerSide = plan.operations.length >= 6 || 
        plan.operations.some(op => op.name === 'createGrid');

      if (shouldExecuteServerSide) {
        // Server-side execution for complex operations
        const result = await aiCanvasService.requestExecute(prompt, canvasSnapshot);
        toast.success(`Created ${result.executionSummary.shapeIds.length} shapes`);
      } else {
        // Client-side execution for simple operations
        // Get user info for metadata
        const { user } = canvasContext as any;
        const userId = user?.userId || 'ai-agent';
        const userEmail = user?.email || 'ai@collabcanvas.com';
        
        const contextMethods: CanvasContextMethods = {
          addRectangle: async (x, y, width, height, color) => {
            await canvasContext.addRectangleFull({ 
              x, y, width, height, color,
              createdBy: userId,
              lastModifiedBy: userId
            });
            // Shape is auto-selected, get the selected ID
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          addCircle: async (x, y, radius, color) => {
            await canvasContext.addCircleFull({ 
              x, y, radius, color,
              createdBy: userId,
              lastModifiedBy: userId
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          addTriangle: async (x, y, width, height, color) => {
            await canvasContext.addTriangleFull({ 
              x, y, width, height, color,
              createdBy: userId,
              lastModifiedBy: userId
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          addLine: async (x1, y1, x2, y2, color) => {
            await canvasContext.addLineFull({ 
              x: x1, y: y1, x2, y2, color,
              strokeWidth: 2,
              createdBy: userId,
              lastModifiedBy: userId
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          addText: async (x, y, text, fontSize, color) => {
            await canvasContext.addTextFull({ 
              x, y, text, fontSize, 
              color,
              width: 200,
              height: fontSize * 1.5,
              fontFamily: 'sans-serif',
              fontWeight: 'normal',
              fontStyle: 'normal',
              textColor: color,
              backgroundColor: 'transparent',
              createdBy: userId,
              lastModifiedBy: userId
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          updateShape: async (id, updates) => {
            canvasContext.updateShape(id, updates, false);
            await new Promise(resolve => setTimeout(resolve, 10));
          },
          deleteSelected: async () => {
            canvasContext.deleteSelected();
            await new Promise(resolve => setTimeout(resolve, 10));
          },
          bringToFront: (id: string) => {
            canvasContext.bringToFront(id);
          },
          sendToBack: (id: string) => {
            canvasContext.sendToBack(id);
          },
          selectShape: (id: string) => {
            canvasContext.selectShape(id);
          },
          rectangles: canvasContext.rectangles,
        };

        // Execute plan
        const createdIds = await executePlan(
          plan.operations,
          contextMethods,
          (current, total, operation) => {
            setProgress({ current, total, operation });
          }
        );

        // Show success message
        if (createdIds.length > 0) {
          toast.success(`Created ${createdIds.length} shape(s)`);
        } else if (plan.operations.length > 0) {
          toast.success('Command executed successfully');
        }
      }

      // Clear progress
      setProgress(null);
    } catch (err) {
      console.error('AI Command Error:', err);
      
      const error = err as Error;
      setError(error);

      // Show user-friendly error message
      if (err instanceof AIServiceError) {
        if (err.code === 'AUTHENTICATION_REQUIRED') {
          toast.error('Please sign in to use AI features');
        } else if (err.code === 'RATE_LIMIT') {
          toast.error('AI rate limit exceeded. Please try again later.');
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Failed to execute command. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [canvasContext, getCanvasSnapshot]);

  const value: AIContextType = {
    isProcessing,
    lastPlan,
    error,
    progress,
    executeCommand,
    clearError,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

/**
 * Hook to use AI context
 */
export function useAI(): AIContextType {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

