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
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Operation Result Type
 */
export interface OperationResult {
  operation: AIOperation;
  status: 'pending' | 'executing' | 'success' | 'error';
  error?: string;
  createdIds?: string[];
}

/**
 * Chat Message Type
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  operations?: AIOperation[];
  operationResults?: OperationResult[];
  rationale?: string;
}

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
  clarification: {
    question: string;
    options: string[];
    originalPrompt: string;
  } | null;

  // Chat state
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  updateOperationStatus: (messageId: string, operationIndex: number, statusUpdate: Partial<OperationResult>) => void;
  clearChat: () => void;

  // Methods
  executeCommand: (prompt: string, clarificationResponse?: string) => Promise<void>;
  clearError: () => void;
  cancelClarification: () => void;
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
 * Helper function to save command history to localStorage
 */
function saveCommandToHistory(prompt: string, success: boolean, result?: string) {
  try {
    const history = JSON.parse(localStorage.getItem('ai_command_history') || '[]');
    history.push({
      prompt,
      timestamp: Date.now(),
      success,
      result,
    });
    // Keep only last 50 commands
    if (history.length > 50) {
      history.shift();
    }
    localStorage.setItem('ai_command_history', JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save command history:', e);
  }
}

/**
 * AI Provider
 */
/**
 * Helper function to generate unique IDs
 */
function generateId(): string {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function AIProvider({ children }: AIProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPlan, setLastPlan] = useState<AIPlan | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    operation?: AIOperation;
  } | null>(null);
  const [clarification, setClarification] = useState<{
    question: string;
    options: string[];
    originalPrompt: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const canvasContext = useCanvas();
  const { user } = useAuth();

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Cancel clarification and reset state
   */
  const cancelClarification = useCallback(() => {
    setClarification(null);
    setIsProcessing(false);
  }, []);

  /**
   * Add a chat message
   */
  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  /**
   * Update operation status for a specific message
   */
  const updateOperationStatus = useCallback((
    messageId: string,
    operationIndex: number,
    statusUpdate: Partial<OperationResult>
  ) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== messageId || !msg.operationResults) return msg;
      
      const updatedResults = [...msg.operationResults];
      updatedResults[operationIndex] = {
        ...updatedResults[operationIndex],
        ...statusUpdate
      };
      
      return { ...msg, operationResults: updatedResults };
    }));
  }, []);

  /**
   * Clear all chat messages
   */
  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  /**
   * Get current canvas snapshot for AI
   */
  const getCanvasSnapshot = useCallback((): CanvasSnapshot => {
    // Group shapes by type to generate sequential names for unnamed shapes
    const shapeCountsByType: Record<string, number> = {};
    
    const shapes = canvasContext.rectangles.map((shape, index) => {
      // Generate a fallback name if shape doesn't have one
      let displayName = shape.name;
      if (!displayName || displayName.trim() === '') {
        const type = shape.type;
        shapeCountsByType[type] = (shapeCountsByType[type] || 0) + 1;
        // Capitalize first letter: circle -> Circle
        const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
        displayName = `${capitalizedType} ${shapeCountsByType[type]}`;
      }
      
      return {
        id: shape.id,
        type: shape.type as any,
        name: displayName,
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
      };
    });

    // Calculate visible viewport dimensions in canvas coordinates
    const viewport = canvasContext.viewport;
    const stageSize = canvasContext.stageSize;
    const visibleWidth = stageSize.width / viewport.scale;
    const visibleHeight = stageSize.height / viewport.scale;
    
    // Calculate viewport center in canvas coordinates
    // viewport.x and viewport.y are negative when panned right/down
    const centerX = -viewport.x / viewport.scale + visibleWidth / 2;
    const centerY = -viewport.y / viewport.scale + visibleHeight / 2;

    return {
      shapes,
      canvasWidth: 5000,
      canvasHeight: 5000,
      selectedIds: canvasContext.selectedIds || [],
      viewport: {
        x: viewport.x,
        y: viewport.y,
        scale: viewport.scale,
        visibleWidth,
        visibleHeight,
        centerX,
        centerY,
      },
    };
  }, [canvasContext.rectangles, canvasContext.selectedIds, canvasContext.viewport, canvasContext.stageSize]);

  /**
   * Execute an AI command
   */
  const executeCommand = useCallback(async (prompt: string, clarificationResponse?: string) => {
    if (!prompt || prompt.trim().length === 0) {
      toast.error('Please enter a command');
      return;
    }

    // 1. Add user message to chat
    const userMessageId = generateId();
    addChatMessage({
      id: userMessageId,
      type: 'user',
      content: prompt,
      timestamp: Date.now(),
    });

    setIsProcessing(true);
    setError(null);
    setProgress(null);

    try {
      // Get current canvas state
      const canvasSnapshot = getCanvasSnapshot();

      // Build enhanced prompt if this is a clarification response
      let enhancedPrompt = prompt;
      if (clarificationResponse) {
        enhancedPrompt = `${prompt} (User clarified: ${clarificationResponse})`;
      }

      // Request plan from AI
      const plan = await aiCanvasService.requestPlan(enhancedPrompt, canvasSnapshot);
      setLastPlan(plan);

      // Check if AI needs clarification
      if (plan.needsClarification) {
        // Add a nice clarification message to chat
        addChatMessage({
          id: generateId(),
          type: 'ai',
          content: plan.needsClarification.question || 'I need clarification to proceed.',
          timestamp: Date.now(),
          rationale: plan.needsClarification.question,
        });
        
        // Add system message with options list
        if (plan.needsClarification.options && plan.needsClarification.options.length > 0) {
          const optionsList = plan.needsClarification.options
            .map((opt, i) => `${i + 1}. ${opt}`)
            .join('\n');
          
          addChatMessage({
            id: generateId(),
            type: 'system',
            content: `Please select an option:\n${optionsList}`,
            timestamp: Date.now(),
          });
        }
        
        // Show clarification modal with clickable options
        setClarification({
          question: plan.needsClarification.question,
          options: plan.needsClarification.options || [],
          originalPrompt: prompt,
        });
        setIsProcessing(false);
        return;
      }

      // Clear any previous clarification
      setClarification(null);

      // 2. Add AI message with operations
      const aiMessageId = generateId();
      addChatMessage({
        id: aiMessageId,
        type: 'ai',
        content: plan.rationale || 'Executing your request...',
        timestamp: Date.now(),
        operations: plan.operations,
        operationResults: plan.operations.map(op => ({
          operation: op,
          status: 'pending' as const,
        })),
        rationale: plan.rationale,
      });

      // Determine execution mode
      // Simple/medium operations (<= 50): Client-side for speed (~100-2000ms)
      // Complex operations (> 50 or grids): Server-side for atomicity
      const CLIENT_SIDE_THRESHOLD = 50;
      const shouldExecuteServerSide = plan.operations.length > CLIENT_SIDE_THRESHOLD || 
        plan.operations.some(op => op.name === 'createGrid');

      let resultMessage = '';
      if (shouldExecuteServerSide) {
        // Server-side execution for complex operations
        const result = await aiCanvasService.requestExecute(prompt, canvasSnapshot);
        resultMessage = `Created ${result.executionSummary.shapeIds.length} shapes`;
        
        // Mark all operations as success
        plan.operations.forEach((op, index) => {
          updateOperationStatus(aiMessageId, index, {
            status: 'success',
            createdIds: result.executionSummary?.shapeIds || [],
          });
        });

        // Success message
        addChatMessage({
          id: generateId(),
          type: 'system',
          content: `✅ Successfully created ${result.executionSummary?.shapeIds?.length || 0} shape(s)`,
          timestamp: Date.now(),
        });

        toast.success(resultMessage);
      } else {
        // Client-side execution for simple operations
        // Get authenticated user info for Firestore security rules
        if (!user || !user.email) {
          throw new Error('User not authenticated');
        }
        const userEmail = user.email;
        
        const contextMethods: CanvasContextMethods = {
          addRectangle: async (x, y, width, height, color) => {
            await canvasContext.addRectangleFull({ 
              x, y, width, height, color,
              createdBy: userEmail,
              lastModifiedBy: userEmail
            });
            // Shape is auto-selected, get the selected ID
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          addCircle: async (x, y, radius, color) => {
            await canvasContext.addCircleFull({ 
              x, y, radius, color,
              createdBy: userEmail,
              lastModifiedBy: userEmail
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          addTriangle: async (x, y, width, height, color) => {
            await canvasContext.addTriangleFull({ 
              x, y, width, height, color,
              createdBy: userEmail,
              lastModifiedBy: userEmail
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          addLine: async (x1, y1, x2, y2, color) => {
            await canvasContext.addLineFull({ 
              x: x1, y: y1, x2, y2, color,
              strokeWidth: 2,
              createdBy: userEmail,
              lastModifiedBy: userEmail
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
              createdBy: userEmail,
              lastModifiedBy: userEmail
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            return canvasContext.selectedIds[0] || '';
          },
          updateShape: async (id, updates) => {
            // Add lastModifiedBy to updates for Firestore security rules
            const updatesWithMetadata = {
              ...updates,
              lastModifiedBy: userEmail
            };
            canvasContext.updateShape(id, updatesWithMetadata, false);
            await new Promise(resolve => setTimeout(resolve, 10));
          },
          deleteSelected: async () => {
            canvasContext.deleteSelected();
            await new Promise(resolve => setTimeout(resolve, 10));
          },
          deleteRectangle: async (id: string) => {
            await canvasContext.deleteRectangle(id);
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
          deselectAll: () => {
            canvasContext.deselectAll();
          },
          rectangles: canvasContext.rectangles,
        };

        // Execute plan with streaming feedback
        const createdIds = await executePlan(
          plan.operations,
          contextMethods,
          (current, total, operationIndex, operation) => {
            // Update operation status to "executing"
            updateOperationStatus(aiMessageId, operationIndex, {
              status: 'executing',
            });
            
            // Update progress indicator
            setProgress({ current, total, operation });
          },
          true  // Enable streaming feedback
        );

        // Mark all operations as success
        plan.operations.forEach((op, index) => {
          updateOperationStatus(aiMessageId, index, {
            status: 'success',
            createdIds: createdIds.length > 0 ? [createdIds[index]] : [],
          });
        });

        // Show success message
        if (createdIds.length > 0) {
          resultMessage = `Created ${createdIds.length} shape(s)`;
          addChatMessage({
            id: generateId(),
            type: 'system',
            content: `✅ Successfully created ${createdIds.length} shape(s)`,
            timestamp: Date.now(),
          });
          toast.success(resultMessage);
        } else if (plan.operations.length > 0) {
          resultMessage = 'Command executed successfully';
          addChatMessage({
            id: generateId(),
            type: 'system',
            content: `✅ Successfully completed ${plan.operations.length} operation(s)`,
            timestamp: Date.now(),
          });
          toast.success(resultMessage);
        }
      }

      // Save to history
      saveCommandToHistory(prompt, true, resultMessage);

      // Clear progress
      setProgress(null);
    } catch (err) {
      console.error('AI Command Error:', err);
      
      const error = err as Error;
      setError(error);

      // Extract clean error message (strip JSON if present)
      let errorMessage = error.message || 'Failed to execute command';
      
      // If error message contains JSON, extract just the question if present
      if (errorMessage.includes('{') && errorMessage.includes('}')) {
        try {
          const jsonMatch = errorMessage.match(/\{.*\}/s);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.needsClarification?.question) {
              errorMessage = parsed.needsClarification.question;
            } else {
              errorMessage = 'An error occurred. Please try a different command.';
            }
          }
        } catch {
          // If JSON parsing fails, use generic message
          errorMessage = 'An error occurred. Please try rephrasing your command.';
        }
      }

      // Error message in chat
      addChatMessage({
        id: generateId(),
        type: 'system',
        content: `❌ Error: ${errorMessage}`,
        timestamp: Date.now(),
      });

      // Save failed command to history
      saveCommandToHistory(prompt, false, error.message);

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
  }, [canvasContext, getCanvasSnapshot, user, addChatMessage, updateOperationStatus]);

  const value: AIContextType = {
    isProcessing,
    lastPlan,
    error,
    progress,
    clarification,
    chatMessages,
    addChatMessage,
    updateOperationStatus,
    clearChat,
    executeCommand,
    clearError,
    cancelClarification,
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

