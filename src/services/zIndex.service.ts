// Z-Index service for automatic layering and manual override
// CONVENTION: Higher z-index = front, lower z-index = back
import { Shape } from '../types/canvas.types';

/**
 * Auto-update z-index: Move shape to front (highest z-index)
 * @param shapes - All rectangles in the canvas
 * @param shapeId - ID of the shape to move to front
 * @returns Updated rectangles array with target shape at highest z-index
 * 
 * NOTE: Much simpler than old approach - no sorting or recalculation needed!
 * Just assign maxZIndex + 1 to the edited shape.
 */
export const autoUpdateZIndex = (shapes: Shape[], shapeId: string): Shape[] => {
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
 * Uses atomic 3-phase approach to avoid temporary conflicts/flickers:
 * Phase 1: Move target shape to temporary high value (out of the way)
 * Phase 2: Shift other shapes to make room at target z-index
 * Phase 3: Move target shape to final desired z-index
 * 
 * @param shapes - All rectangles in the canvas
 * @param shapeId - ID of the shape to update
 * @param newZIndex - New z-index to set (positive integer)
 * @returns Updated rectangles array with recalculated z-indices
 * 
 * Example: Setting shape C from z-index 3 to 5 (moving forward):
 * Before: [A:1(back), B:2, C:3, D:4, E:5(front)]
 * Phase 1: C → 1000 (temp): [A:1, B:2, D:4, E:5, C:1000]
 * Phase 2: Shift D,E back: [A:1, B:2, D:3, E:4, C:1000]
 * Phase 3: C → 5: [A:1, B:2, D:3, E:4, C:5]
 */
export const manualSetZIndex = (shapes: Shape[], shapeId: string, newZIndex: number): Shape[] => {
  if (newZIndex < 1) return shapes; // Z-index must be positive

  const shapeIndex = shapes.findIndex(s => s.id === shapeId);
  if (shapeIndex === -1) return shapes; // Shape not found

  const currentShape = shapes[shapeIndex];
  const oldZIndex = currentShape.zIndex;

  // If no change, return as-is
  if (oldZIndex === newZIndex) return shapes;

  // Find max z-index for temporary high value
  const maxZIndex = Math.max(...shapes.map(s => s.zIndex));
  const TEMP_HIGH_VALUE = maxZIndex + 1000; // Guaranteed to be out of the way

  // PHASE 1: Move target shape to temporary high value
  let updatedShapes = shapes.map(shape =>
    shape.id === shapeId 
      ? { ...shape, zIndex: TEMP_HIGH_VALUE }
      : shape
  );

  // PHASE 2: Shift other shapes to make room at newZIndex
  updatedShapes = updatedShapes.map(shape => {
    if (shape.id === shapeId) return shape; // Skip target (still at temp value)

    if (newZIndex > oldZIndex) {
      // Moving target forward (toward front)
      // Shapes between oldZIndex and newZIndex shift back by 1
      if (shape.zIndex > oldZIndex && shape.zIndex <= newZIndex) {
        return { ...shape, zIndex: shape.zIndex - 1 };
      }
    } else {
      // Moving target backward (toward back)
      // Shapes between newZIndex and oldZIndex shift forward by 1
      if (shape.zIndex >= newZIndex && shape.zIndex < oldZIndex) {
        return { ...shape, zIndex: shape.zIndex + 1 };
      }
    }
    return shape;
  });

  // PHASE 3: Move target shape to final desired z-index
  updatedShapes = updatedShapes.map(shape =>
    shape.id === shapeId 
      ? { ...shape, zIndex: newZIndex }
      : shape
  );

  return updatedShapes;
};

/**
 * Validate z-indices: Check for duplicates only (gaps are allowed with new convention)
 * NEW CONVENTION: Higher z-index = front, gaps allowed (no recalculation needed)
 * @param shapes - All rectangles in the canvas
 * @returns { isValid: boolean, duplicates: number[], gaps: number[] }
 */
export const validateZIndices = (shapes: Shape[]): { 
  isValid: boolean; 
  duplicates: number[]; 
  gaps: number[] 
} => {
  const zIndices = shapes.map(s => s.zIndex).sort((a, b) => a - b);
  const duplicates: number[] = [];
  const gaps: number[] = []; // Gaps are tracked but allowed (for backward compatibility)

  // Check for duplicates (NOT ALLOWED - this is the only validation that matters)
  for (let i = 0; i < zIndices.length - 1; i++) {
    if (zIndices[i] === zIndices[i + 1] && !duplicates.includes(zIndices[i])) {
      duplicates.push(zIndices[i]);
    }
  }

  // Check for gaps (for informational purposes only - gaps are EXPECTED and ALLOWED)
  for (let i = 1; i <= shapes.length; i++) {
    if (!zIndices.includes(i)) {
      gaps.push(i);
    }
  }

  return {
    isValid: duplicates.length === 0, // Only check duplicates, gaps are fine!
    duplicates,
    gaps
  };
};
