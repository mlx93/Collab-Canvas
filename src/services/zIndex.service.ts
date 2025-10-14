// Z-Index service for automatic layering and manual override
import { Rectangle } from '../types/canvas.types';

/**
 * Recalculate all z-indices to ensure no duplicates and maintain order
 * @param shapes - All rectangles in the canvas
 * @returns Updated rectangles array with normalized z-indices (1, 2, 3, ...)
 * Note: Sorts by z-index descending, so highest z-index becomes 1 (front)
 */
export const recalculateAllZIndices = (shapes: Rectangle[]): Rectangle[] => {
  // Sort shapes by current z-index (descending: highest first)
  const sorted = [...shapes].sort((a, b) => b.zIndex - a.zIndex);

  // Reassign z-indices sequentially starting from 1
  // Shape with highest z-index gets 1 (front), next gets 2, etc.
  return sorted.map((shape, index) => ({
    ...shape,
    zIndex: index + 1
  }));
};

/**
 * Auto-update z-index: Move shape to front (z-index 1), push others back
 * @param shapes - All rectangles in the canvas
 * @param shapeId - ID of the shape to move to front
 * @returns Updated rectangles array with recalculated z-indices
 */
export const autoUpdateZIndex = (shapes: Rectangle[], shapeId: string): Rectangle[] => {
  const shapeIndex = shapes.findIndex(s => s.id === shapeId);
  if (shapeIndex === -1) return shapes; // Shape not found

  const currentShape = shapes[shapeIndex];
  
  // Find the minimum z-index (front position)
  const minZIndex = shapes.length > 0 ? Math.min(...shapes.map(s => s.zIndex)) : 1;
  
  // If already at front, no change needed
  if (currentShape.zIndex === minZIndex && shapes.filter(s => s.zIndex === minZIndex).length === 1) {
    return shapes;
  }
  
  // Find the highest z-index (back position)
  const maxZIndex = shapes.length > 0 ? Math.max(...shapes.map(s => s.zIndex)) : 0;
  
  // Assign target shape the highest z-index + 1 (temporarily)
  // This ensures no other shapes change position during this step
  const updatedShapes = shapes.map(shape => {
    if (shape.id === shapeId) {
      return { ...shape, zIndex: maxZIndex + 1 };
    }
    return shape; // Keep all other shapes unchanged
  });

  // Now recalculate all z-indices in one atomic operation
  // The shape with highest z-index will become z-index 1 (front)
  // All others maintain their relative order
  return recalculateAllZIndices(updatedShapes);
};

/**
 * Manual z-index override: Set specific z-index with push-down recalculation
 * @param shapes - All rectangles in the canvas
 * @param shapeId - ID of the shape to update
 * @param newZIndex - New z-index to set (positive integer)
 * @returns Updated rectangles array with recalculated z-indices
 * 
 * Example: Setting shape C from z-index 3 to 1:
 * Before: [A:1, B:2, C:3]
 * After: [C:1, A:2, B:3]
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
      if (newZIndex < oldZIndex) {
        // Moving shape forward (lower z-index)
        // Shapes between newZIndex and oldZIndex need to shift back
        if (shape.zIndex >= newZIndex && shape.zIndex < oldZIndex) {
          return { ...shape, zIndex: shape.zIndex + 1 };
        }
      } else {
        // Moving shape backward (higher z-index)
        // Shapes between oldZIndex and newZIndex need to shift forward
        if (shape.zIndex > oldZIndex && shape.zIndex <= newZIndex) {
          return { ...shape, zIndex: shape.zIndex - 1 };
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
