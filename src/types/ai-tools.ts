/**
 * AI Tool Schemas and Plan Types
 * 
 * These types define the interface between the AI agent and the canvas operations.
 * They are shared between the client and server (Cloud Functions).
 */

export type ShapeKind = 'rectangle' | 'circle' | 'triangle' | 'line' | 'text';

/**
 * Tool parameter schemas for all AI operations
 */
export interface AIToolSchemas {
  // Creation Commands
  createRectangle: { 
    x: number; 
    y: number; 
    width: number; 
    height: number; 
    color: string; 
    name?: string;
    opacity?: number;
  };
  createCircle: { 
    x: number; 
    y: number; 
    radius: number; 
    color: string; 
    name?: string;
    opacity?: number;
  };
  createTriangle: { 
    x: number; 
    y: number; 
    width: number; 
    height: number; 
    color: string; 
    name?: string;
    opacity?: number;
  };
  createLine: { 
    x1: number; 
    y1: number; 
    x2: number; 
    y2: number; 
    color: string; 
    name?: string;
    opacity?: number;
  };
  createText: { 
    text: string; 
    x: number; 
    y: number; 
    fontSize: number; 
    color: string; 
    name?: string;
    opacity?: number;
  };

  // Manipulation Commands
  moveElement: { 
    id: string; 
    x: number; 
    y: number; 
  };
  resizeElement: { 
    id: string; 
    width?: number; 
    height?: number; 
    radius?: number; 
    x2?: number; 
    y2?: number; 
  };
  rotateElement: { 
    id: string; 
    rotation: number; 
  };
  updateStyle: { 
    id: string; 
    color?: string; 
    opacity?: number; 
    visible?: boolean; 
    locked?: boolean; 
    name?: string; 
  };

  // Layout Commands
  arrangeElements: { 
    ids: string[]; 
    arrangement: 'horizontal' | 'vertical'; 
    spacing?: number; 
  };
  createGrid: { 
    rows: number; 
    cols: number; 
    cellWidth: number; 
    cellHeight: number; 
    spacing?: number; 
    startX?: number; 
    startY?: number; 
    color?: string; 
    type?: Exclude<ShapeKind, 'text'>; 
    namePrefix?: string; 
  };

  // Layering Commands
  bringToFront: { id: string };
  sendToBack: { id: string };

  // Delete Command
  deleteElement: { id: string };

  // Canvas Insight
  getCanvasState: {};
}

/**
 * Union type of all operation names
 */
export type AIOperationName = keyof AIToolSchemas;

/**
 * Single AI operation with typed arguments
 */
export interface AIOperation<N extends AIOperationName = AIOperationName> {
  name: N;
  args: AIToolSchemas[N];
}

/**
 * Complete AI plan returned from the Cloud Function
 */
export interface AIPlan {
  operations: AIOperation[];
  rationale?: string;
  needsClarification?: {
    question: string;
    options?: string[];
  } | null;
}

/**
 * Request payload sent to Cloud Function
 */
export interface AICommandRequest {
  prompt: string;
  canvasState: CanvasSnapshot;
  mode?: 'plan' | 'execute';
  clarification?: {
    questionId: string;
    selectedOption: string;
  };
}

/**
 * Simplified canvas state snapshot for AI context
 */
export interface CanvasSnapshot {
  shapes: ShapeSnapshot[];
  canvasWidth: number;
  canvasHeight: number;
  selectedIds: string[];
}

/**
 * Simplified shape snapshot for AI
 */
export interface ShapeSnapshot {
  id: string;
  type: ShapeKind;
  name?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  x2?: number;
  y2?: number;
  color: string;
  opacity: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
}

/**
 * Response from Cloud Function
 */
export interface AICommandResponse {
  success: boolean;
  plan?: AIPlan;
  executionSummary?: {
    operationsApplied: number;
    shapeIds: string[];
    timestamp: number;
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Error codes for AI operations
 */
export enum AIErrorCode {
  INVALID_PROMPT = 'INVALID_PROMPT',
  API_ERROR = 'API_ERROR',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}

