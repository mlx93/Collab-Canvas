/**
 * AI Context
 * 
 * Provides AI agent functionality to the application.
 * Orchestrates command execution, plan generation, and state management.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AIPlan, AIOperation, CanvasSnapshot, AICommandHistoryEntry } from '../types/ai-tools';
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
  type: 'user' | 'ai' | 'system' | 'clarification';
  content: string;
  timestamp: number;
  operations?: AIOperation[];
  operationResults?: OperationResult[];
  rationale?: string;
  clarification?: {
    question: string;
    options: string[];
    originalPrompt: string;
  };
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

  // History state (Phase 3)
  commandHistory: AICommandHistoryEntry[];
  rerunCommand: (historyId: string) => Promise<void>;
  clearHistory: () => void;
  deleteHistoryEntry: (historyId: string) => void;

  // Methods
  executeCommand: (prompt: string, clarificationResponse?: string | string[]) => Promise<void>;
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
 * Helper function to generate unique IDs
 */
function generateId(): string {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Helper function to track shape changes by operation type
 */
function trackOperationShapeChanges(
  operation: AIOperation,
  modifiedShapeIds: string[],
  deletedShapeIds: string[]
): void {
  const opName = operation.name;
  const opArgs = operation.args as any;
  
  // Define operation type mapping
  const OPERATION_TRACKING: Record<string, 'created' | 'modified' | 'deleted' | 'none'> = {
    // Creation operations (tracked via executePlan return value)
    createRectangle: 'none',
    createCircle: 'none',
    createTriangle: 'none',
    createLine: 'none',
    createText: 'none',
    createGrid: 'none',
    
    // Modification operations
    moveElement: 'modified',
    resizeElement: 'modified',
    rotateElement: 'modified',
    updateStyle: 'modified',
    arrangeElements: 'modified', // modifies all shapes in args.ids
    
    // Deletion operations
    deleteElement: 'deleted',
    deleteMultipleElements: 'deleted',
    
    // Layer operations (modify z-index)
    bringToFront: 'modified',
    sendToBack: 'modified',
  };
  
  const trackingType = OPERATION_TRACKING[opName] || 'none';
  
  if (trackingType === 'modified') {
    // Single shape operations
    if (opArgs.id && !modifiedShapeIds.includes(opArgs.id)) {
      modifiedShapeIds.push(opArgs.id);
    }
    
    // Multi-shape operations (arrangeElements)
    if (opArgs.ids && Array.isArray(opArgs.ids)) {
      opArgs.ids.forEach((id: string) => {
        if (!modifiedShapeIds.includes(id)) {
          modifiedShapeIds.push(id);
        }
      });
    }
  } else if (trackingType === 'deleted') {
    // Single delete
    if (opArgs.id && !deletedShapeIds.includes(opArgs.id)) {
      deletedShapeIds.push(opArgs.id);
    }
    
    // Multiple delete
    if (opArgs.ids && Array.isArray(opArgs.ids)) {
      opArgs.ids.forEach((id: string) => {
        if (!deletedShapeIds.includes(id)) {
          deletedShapeIds.push(id);
        }
      });
    }
  }
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

  // Phase 3: Enhanced command history
  const [commandHistory, setCommandHistory] = useState<AICommandHistoryEntry[]>(() => {
    const saved = localStorage.getItem('ai_command_history_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const canvasContext = useCanvas();
  const { user } = useAuth();

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Save command to history with enhanced tracking (Phase 3)
   */
  const saveCommandToHistory = useCallback((entry: AICommandHistoryEntry) => {
    setCommandHistory(prev => {
      const updated = [...prev, entry];
      
      // Keep last 100 commands
      if (updated.length > 100) {
        updated.shift();
      }
      
      // Save to localStorage
      localStorage.setItem('ai_command_history_v2', JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  /**
   * Rerun a command from history
   */
  const rerunCommand = useCallback(async (historyId: string) => {
    const entry = commandHistory.find(e => e.id === historyId);
    if (!entry) {
      console.error('Command not found in history:', historyId);
      return;
    }
    
    console.log('Rerunning command:', entry.prompt);
    
    // Re-execute the command
    await executeCommand(entry.prompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandHistory]);

  /**
   * Clear all command history
   */
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    localStorage.removeItem('ai_command_history_v2');
  }, []);

  /**
   * Delete a single history entry
   */
  const deleteHistoryEntry = useCallback((historyId: string) => {
    setCommandHistory(prev => {
      const updated = prev.filter(e => e.id !== historyId);
      localStorage.setItem('ai_command_history_v2', JSON.stringify(updated));
      return updated;
    });
  }, []);

  /**
   * Add a chat message
   */
  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  /**
   * Cancel clarification and reset state
   */
  const cancelClarification = useCallback(() => {
    // Add a system message to chat indicating cancellation
    addChatMessage({
      id: `cancel-${Date.now()}`,
      type: 'system',
      content: 'Command cancelled by user.',
      timestamp: Date.now(),
    });
    
    // Clear any shapes that were selected during clarification preview
    canvasContext.deselectAll();
    
    setClarification(null);
    setIsProcessing(false);
  }, [addChatMessage, canvasContext]);

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
   * @param clarificationResponse - Single option or array of options selected by user
   */
  const executeCommand = useCallback(async (prompt: string, clarificationResponse?: string | string[]) => {
    if (!prompt || prompt.trim().length === 0) {
      toast.error('Please enter a command');
      return;
    }

    // Check for "yes" response when clarification is pending
    const normalizedPrompt = prompt.toLowerCase().trim();
    if (clarification && !clarificationResponse) {
      // User typed "yes", "y", "yep", "sure", "ok", "confirm", etc.
      if (/^(yes|y|yep|yeah|sure|ok|okay|confirm|go ahead|proceed)$/i.test(normalizedPrompt)) {
        // Auto-select all options and re-execute the original command
        console.log('User confirmed with "yes" - selecting all options');
        await executeCommand(clarification.originalPrompt, clarification.options);
        return;
      }
    }

    // === PHASE 3: ADD TIMING AND TRACKING VARIABLES ===
    const startTime = Date.now();
    const historyId = generateId();
    const createdShapeIds: string[] = [];
    const modifiedShapeIds: string[] = [];
    const deletedShapeIds: string[] = [];
    
    let planningTime = 0;
    let executionTime = 0;
    let executionMode: 'client' | 'server' | 'cached' = 'client';
    let cacheHit = false;

    // If this is a clarification response, clear the clarification UI immediately
    // This unmounts the AIClarificationMessage component and stops its useEffect
    // from continuously re-selecting shapes
    if (clarificationResponse) {
      setClarification(null);
      // Also deselect shapes that were selected as preview
      canvasContext.deselectAll();
    }

    // 1. Add user message to chat (Phase 2)
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
        if (Array.isArray(clarificationResponse)) {
          // Multi-select: Execute on multiple items
          const items = clarificationResponse.join(', ');
          enhancedPrompt = `${prompt} (User selected multiple: ${items})`;
        } else {
          // Single select: Execute on one item
          enhancedPrompt = `${prompt} (User clarified: ${clarificationResponse})`;
        }
      }

      // === PHASE 3: TRACK PLANNING TIME ===
      const planningStartTime = Date.now();

      // Request plan from AI
      const plan = await aiCanvasService.requestPlan(enhancedPrompt, canvasSnapshot);
      setLastPlan(plan);

      planningTime = Date.now() - planningStartTime;
      
      // === PHASE 3: DETECT CACHE HIT ===
      if (plan.cached === true) {
        cacheHit = true;
        executionMode = 'cached';
      }

      // Check if AI needs clarification
      if (plan.needsClarification) {
        // Add inline clarification message to chat (NEW: embedded in chat UI)
        addChatMessage({
          id: generateId(),
          type: 'clarification',
          content: plan.needsClarification.question || 'I need clarification to proceed.',
          timestamp: Date.now(),
          clarification: {
            question: plan.needsClarification.question,
            options: plan.needsClarification.options || [],
            originalPrompt: prompt,
          },
        });
        
        // Also set clarification state for backward compatibility
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
      // Simple/medium operations (<= 100): Client-side for speed (~100-2000ms)
      // Complex operations (> 100 or grids): Server-side for atomicity
      const CLIENT_SIDE_THRESHOLD = 100;
      const shouldExecuteServerSide = plan.operations.length > CLIENT_SIDE_THRESHOLD || 
        plan.operations.some(op => op.name === 'createGrid');

      let resultMessage = '';
      if (shouldExecuteServerSide) {
        // === SERVER-SIDE EXECUTION ===
        executionMode = 'server';
        
        // === PHASE 3: TRACK EXECUTION TIME ===
        const executionStartTime = Date.now();
        
        const result = await aiCanvasService.requestExecute(prompt, canvasSnapshot);
        
        // Phase 3: Track created shapes (server-side only tracks creation)
        createdShapeIds.push(...(result.executionSummary?.shapeIds || []));
        // Note: Server-side does NOT track modified/deleted - only client-side does
        
        executionTime = Date.now() - executionStartTime;
        
        resultMessage = `Created ${result.executionSummary.shapeIds.length} shapes`;
        
        // Phase 2: Mark all operations as success
        plan.operations.forEach((op, index) => {
          updateOperationStatus(aiMessageId, index, {
            status: 'success',
            createdIds: result.executionSummary?.shapeIds || [],
          });
        });

        // Phase 2: Success message
        addChatMessage({
          id: generateId(),
          type: 'system',
          content: `✅ Successfully created ${result.executionSummary?.shapeIds?.length || 0} shape(s)`,
          timestamp: Date.now(),
        });

        toast.success(resultMessage);
      } else {
        // === CLIENT-SIDE EXECUTION ===
        executionMode = cacheHit ? 'cached' : 'client';
        
        // === PHASE 3: TRACK EXECUTION TIME ===
        const executionStartTime = Date.now();
        
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
            // Brief delay to allow state to settle (reduced from 50ms for performance)
            await new Promise(resolve => setTimeout(resolve, 10));
            return canvasContext.selectedIds[0] || '';
          },
          addCircle: async (x, y, radius, color) => {
            await canvasContext.addCircleFull({ 
              x, y, radius, color,
              createdBy: userEmail,
              lastModifiedBy: userEmail
            });
            await new Promise(resolve => setTimeout(resolve, 10));
            return canvasContext.selectedIds[0] || '';
          },
          addTriangle: async (x, y, width, height, color) => {
            await canvasContext.addTriangleFull({ 
              x, y, width, height, color,
              createdBy: userEmail,
              lastModifiedBy: userEmail
            });
            await new Promise(resolve => setTimeout(resolve, 10));
            return canvasContext.selectedIds[0] || '';
          },
          addLine: async (x1, y1, x2, y2, color) => {
            await canvasContext.addLineFull({ 
              x: x1, y: y1, x2, y2, color,
              strokeWidth: 2,
              createdBy: userEmail,
              lastModifiedBy: userEmail
            });
            await new Promise(resolve => setTimeout(resolve, 10));
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
            await new Promise(resolve => setTimeout(resolve, 10));
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

        // Execute plan with streaming feedback + Phase 3 tracking
        const createdIds = await executePlan(
          plan.operations,
          contextMethods,
          (current, total, operationIndex, operation) => {
            // Phase 2: Update operation status to "executing"
            updateOperationStatus(aiMessageId, operationIndex, {
              status: 'executing',
            });
            
            // Phase 3: Track shape changes
            trackOperationShapeChanges(operation, modifiedShapeIds, deletedShapeIds);
            
            // Phase 2: Update progress indicator
            setProgress({ current, total, operation });
          },
          true  // Enable streaming feedback
        );

        // Phase 3: Track created shapes
        createdShapeIds.push(...createdIds);
        
        executionTime = Date.now() - executionStartTime;

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

      // === PHASE 3: CALCULATE TOTAL DURATION ===
      const duration = Date.now() - startTime;

      // === PHASE 3: SAVE TO ENHANCED HISTORY ===
      saveCommandToHistory({
        id: historyId,
        timestamp: Date.now(),
        prompt,
        success: true,
        plan,
        executionSummary: {
          operationsExecuted: plan.operations.length,
          operationsFailed: 0,
          shapesCreated: createdShapeIds,
          shapesModified: modifiedShapeIds,
          shapesDeleted: deletedShapeIds,
          duration,
          planningTime,
          executionTime,
          executionMode,
          cacheHit,
        },
        userId: user?.userId,
        canvasId: 'default',
      });

      // Clear selection state after AI operations complete
      // This prevents shapes from remaining selected and "frozen"
      canvasContext.deselectAll();

      // Clear progress
      setProgress(null);
    } catch (err) {
      console.error('AI Command Error:', err);
      
      const error = err as Error;
      setError(error);

      // === PHASE 3: CALCULATE DURATION ===
      const duration = Date.now() - startTime;
      
      // === PHASE 3: CAPTURE OPERATION INDEX IF AVAILABLE ===
      const operationIndex = (err as any).operationIndex !== undefined ? (err as any).operationIndex : undefined;

      // Extract clean error message (strip JSON if present)
      let errorMessage = error.message || 'Failed to execute command';
      
      // If error message contains JSON, extract just the question if present
      if (errorMessage.includes('{') && errorMessage.includes('}')) {
        try {
          // Find the first { and last } to extract JSON
          const firstBrace = errorMessage.indexOf('{');
          const lastBrace = errorMessage.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonStr = errorMessage.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonStr);
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

      // === PHASE 3: SAVE FAILED HISTORY ENTRY ===
      saveCommandToHistory({
        id: historyId,
        timestamp: Date.now(),
        prompt,
        success: false,
        plan: lastPlan || undefined,
        error: {
          message: error.message || 'Unknown error',
          code: (error as any).code,
          details: error.stack,
          operationIndex,
        },
        executionSummary: {
          operationsExecuted: 0,
          operationsFailed: lastPlan?.operations.length || 0,
          shapesCreated: [],
          shapesModified: [],
          shapesDeleted: [],
          duration,
          planningTime: 0,
          executionTime: 0,
          executionMode: executionMode,
          cacheHit,
        },
        userId: user?.userId,
        canvasId: 'default',
      });

      // Phase 2: Error message in chat
      addChatMessage({
        id: generateId(),
        type: 'system',
        content: `❌ Error: ${errorMessage}`,
        timestamp: Date.now(),
      });

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
      
      // Clear selection state after error to prevent frozen shapes
      canvasContext.deselectAll();
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    commandHistory,
    rerunCommand,
    clearHistory,
    deleteHistoryEntry,
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

