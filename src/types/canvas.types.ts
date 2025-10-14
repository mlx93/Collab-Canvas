// Canvas and shape type definitions
export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  zIndex: number;
  createdBy: string;
  createdAt: Date;
  lastModifiedBy: string;
  lastModified: Date;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasState {
  rectangles: Rectangle[];
  viewport: Viewport;
  selectedShapeId: string | null;
}

