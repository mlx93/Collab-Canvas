/**
 * Type definitions for Cloud Functions
 * (Duplicated from client types for server-side use)
 */

export type ShapeKind = 'rectangle' | 'circle' | 'triangle' | 'line' | 'text';

export interface AIToolSchemas {
  createRectangle: { x: number; y: number; width: number; height: number; color: string; name?: string; opacity?: number };
  createCircle: { x: number; y: number; radius: number; color: string; name?: string; opacity?: number };
  createTriangle: { x: number; y: number; width: number; height: number; color: string; name?: string; opacity?: number };
  createLine: { x1: number; y1: number; x2: number; y2: number; color: string; name?: string; opacity?: number };
  createText: { text: string; x: number; y: number; fontSize: number; color: string; name?: string; opacity?: number };
  moveElement: { id: string; x: number; y: number };
  resizeElement: { id: string; width?: number; height?: number; radius?: number; x2?: number; y2?: number };
  rotateElement: { id: string; rotation: number };
  updateStyle: { id: string; color?: string; opacity?: number; visible?: boolean; locked?: boolean; name?: string };
  arrangeElements: { ids: string[]; arrangement: 'horizontal' | 'vertical'; spacing?: number };
  createGrid: { rows: number; cols: number; cellWidth: number; cellHeight: number; spacing?: number; startX?: number; startY?: number; color?: string; type?: Exclude<ShapeKind, 'text'>; namePrefix?: string };
  bringToFront: { id: string };
  sendToBack: { id: string };
  deleteElement: { id: string };
  deleteMultipleElements: { ids: string[] };
  getCanvasState: {};
}

export type AIOperationName = keyof AIToolSchemas;

export interface AIOperation<N extends AIOperationName = AIOperationName> {
  name: N;
  args: AIToolSchemas[N];
}

export interface AIPlan {
  operations: AIOperation[];
  rationale?: string;
  needsClarification?: {
    question: string;
    options?: string[];
  } | null;
}

export interface AICommandRequest {
  prompt: string;
  canvasState: CanvasSnapshot;
  mode?: 'plan' | 'execute';
  clarification?: {
    questionId: string;
    selectedOption: string;
  };
}

export interface CanvasSnapshot {
  shapes: ShapeSnapshot[];
  canvasWidth: number;
  canvasHeight: number;
  selectedIds: string[];
  viewport: {
    x: number; // Viewport X offset
    y: number; // Viewport Y offset
    scale: number; // Zoom level
    visibleWidth: number; // Width of visible area in canvas coordinates
    visibleHeight: number; // Height of visible area in canvas coordinates
    centerX: number; // Center X of visible viewport in canvas coordinates
    centerY: number; // Center Y of visible viewport in canvas coordinates
  };
}

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

export enum AIErrorCode {
  INVALID_PROMPT = 'INVALID_PROMPT',
  API_ERROR = 'API_ERROR',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}

