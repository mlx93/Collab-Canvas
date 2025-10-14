// Z-Index service for automatic layering and manual override
// CONVENTION: Higher z-index = front, lower z-index = back
import { Rectangle } from '../types/canvas.types';

/**
 * Auto-update z-index: Move shape to front (highest z-index)
 * @param shapes - All rectangles in the canvas
 * @param shapeId - ID of the shape to move to front
 * @returns Updated rectangles array with target shape at highest z-index
 * 
 * NOTE: Much simpler than old approach - no sorting or recalculation needed!
 * Just assign maxZIndex + 1 to the edited shape.
 */
export const autoUpdateZIndex = (shapes: Rectangle[], shapeId: string): Rectangle[] => {
  const shapeIndex = shapes.findIndex(s => s.id === shapeId);
  if (shapeIndex === -1) return shapes; // Shape not found

  const currentShape = shapes[shapeIndex];
  
  // Find the highest z-index (front position)
  const maxZIndex = shapes.length > 0 ? Math.max(...shapes.map(s => s.zIndex)) : 0;
  
  // If already at front, no change needed
  if (currentShape.zIndex === maxZIndex) {
    return shapes;
  }
  
  // Simply assign maxZIndex + 1 - done! No recalculation needed!
  return shapes.map(shape => 
    shape.id === shapeId 
      ? { ...shape, zIndex: maxZIndex + 1 }
      : shape
  );
};

/**
 * Manual z-index override: Set specific z-index with push-down recalculation
 * @param shapes - All rectangles in the canvas
 * @param shapeId - ID of the shape to update
 * @param newZIndex - New z-index to set (positive integer)
 * @returns Updated rectangles array with recalculated z-indices
 * 
 * Example: Setting shape C from z-index 3 to 5 (moving forward):
 * Before: [A:1(back), B:2, C:3, D:4, E:5(front)]
 * After:  [A:1(back), B:2, D:3, E:4, C:5(front)]
 */
export const manualSetZIndex = (shapes: Rectangle[], shapeId: string, newZIndex: number): Rectangle[] => {
  if (newZIndex < 1) return shapes; // Z-index must be positive

  const shapeIndex = shapes.findIndex(s => s.id === shapeId);
  if (shapeIndex === -1) return shapes; // Shape not found

  const currentShape = shapes[shapeIndex];
  const oldZIndex = currentShape.zIndex;

  // If no change, return as-is
  if (oldZIndex === newZIndex) return shapes;

  // Push-down logic: Shift other shapes to make room
  return shapes.map(shape => {
    if (shape.id === shapeId) {
      // Set the target shape to new z-index
      return { ...shape, zIndex: newZIndex };
    } else {
      // Push-down recalculation for other shapes
      if (newZIndex > oldZIndex) {
        // Moving shape forward (higher z-index = toward front)
        // Shapes between oldZIndex and newZIndex need to shift back
        if (shape.zIndex > oldZIndex && shape.zIndex <= newZIndex) {
          return { ...shape, zIndex: shape.zIndex - 1 };
        }
      } else {
        // Moving shape backward (lower z-index = toward back)
        // Shapes between newZIndex and oldZIndex need to shift forward
        if (shape.zIndex >= newZIndex && shape.zIndex < oldZIndex) {
          return { ...shape, zIndex: shape.zIndex + 1 };
        }
      }
      return shape;
    }
  });
};

/**
 * Validate z-indices: Check for duplicates and gaps
 * @param shapes - All rectangles in the canvas
 * @returns { isValid: boolean, duplicates: number[], gaps: number[] }
 */
export const validateZIndices = (shapes: Rectangle[]): { 
  isValid: boolean; 
  duplicates: number[]; 
  gaps: number[] 
} => {
  const zIndices = shapes.map(s => s.zIndex).sort((a, b) => a - b);
  const duplicates: number[] = [];
  const gaps: number[] = [];

  // Check for duplicates
  for (let i = 0; i < zIndices.length - 1; i++) {
    if (zIndices[i] === zIndices[i + 1] && !duplicates.includes(zIndices[i])) {
      duplicates.push(zIndices[i]);
    }
  }

  // Check for gaps (expected: 1, 2, 3, ..., n)
  for (let i = 1; i <= shapes.length; i++) {
    if (!zIndices.includes(i)) {
      gaps.push(i);
    }
  }

  return {
    isValid: duplicates.length === 0 && gaps.length === 0,
    duplicates,
    gaps
  };
};
