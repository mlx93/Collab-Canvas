// Canvas type definitions

/**
 * Shape types supported by the canvas
 */
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'text';

/**
 * Base shape interface with common properties
 * All specific shape types extend this
 */
export interface BaseShape {
  // Core properties
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  color: string;
  
  // Transform properties
  rotation: number; // degrees (0-359)
  opacity: number; // 0-1
  
  // Z-index (higher = front, lower = back)
  zIndex: number;
  
  // Layer management
  visible?: boolean; // Hide/show shape
  locked?: boolean; // Prevent editing
  
  // Metadata
  createdBy: string; // User ID
  createdAt: Date;
  lastModifiedBy: string; // User ID
  lastModified: Date;
  deletedAt?: Date; // Soft delete timestamp
  deletedBy?: string; // User ID who deleted
}

/**
 * Rectangle shape
 */
export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  width: number;
  height: number;
}

/**
 * Circle shape
 */
export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

/**
 * Triangle shape
 */
export interface TriangleShape extends BaseShape {
  type: 'triangle';
  width: number;
  height: number;
}

/**
 * Line shape
 */
export interface LineShape extends BaseShape {
  type: 'line';
  x2: number; // End point X
  y2: number; // End point Y
  strokeWidth: number; // 1-10px
}

/**
 * Text shape
 */
export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  width: number; // Bounding box width (for text wrapping)
  fontSize: number; // 12-72px
  fontFamily: string; // 'sans-serif' | 'serif' | 'monospace'
  fontWeight: string; // 'normal' | 'bold'
  fontStyle: string; // 'normal' | 'italic'
}

/**
 * Union type for all shapes
 */
export type Shape = RectangleShape | CircleShape | TriangleShape | LineShape | TextShape;

/**
 * Legacy Rectangle type (for backward compatibility during migration)
 * @deprecated Use RectangleShape instead
 */
export type Rectangle = RectangleShape;

/**
 * Viewport state (per user, not synced)
 * Represents the user's current view of the canvas
 */
export interface Viewport {
  x: number; // Viewport X position
  y: number; // Viewport Y position
  scale: number; // Zoom level (1 = 100%, 0.1 = 10%, 8 = 800%)
}

/**
 * Current active tool
 */
export type Tool = 'select' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'text' | 'delete';

/**
 * Canvas state managed by CanvasContext
 */
export interface CanvasState {
  rectangles: Shape[]; // Legacy name, but now stores all shape types
  viewport: Viewport;
  selectedRectangleId: string | null; // Legacy name, but selects any shape
  currentTool: Tool;
  loading: boolean;
  error: string | null;
  stageSize: { width: number; height: number };
}
