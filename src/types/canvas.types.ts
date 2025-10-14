// Canvas type definitions

/**
 * Rectangle shape on the canvas
 * Stored in Firestore for persistence
 */
export interface Rectangle {
  // Core properties
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  
  // Z-index (1 = front, higher numbers = further back)
  zIndex: number;
  
  // Metadata
  createdBy: string; // User ID
  createdAt: Date;
  lastModifiedBy: string; // User ID
  lastModified: Date;
}

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
export type Tool = 'select' | 'rectangle' | 'delete';

/**
 * Canvas state managed by CanvasContext
 */
export interface CanvasState {
  rectangles: Rectangle[];
  viewport: Viewport;
  selectedRectangleId: string | null;
  currentTool: Tool;
  loading: boolean;
  error: string | null;
}
