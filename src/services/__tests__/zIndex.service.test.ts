// Unit tests for z-index service
import { autoUpdateZIndex, manualSetZIndex, validateZIndices } from '../zIndex.service';
import { Rectangle } from '../../types/canvas.types';

// Helper to create mock rectangle
const createMockRect = (id: string, zIndex: number): Rectangle => ({
  id,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  color: '#2196F3',
  zIndex,
  createdBy: 'test-user',
  createdAt: new Date(),
  lastModifiedBy: 'test-user',
  lastModified: new Date()
});

describe('zIndex.service', () => {
  describe('autoUpdateZIndex', () => {
    it('should move shape to front (highest z-index)', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const result = autoUpdateZIndex(shapes, 'c');
      const shapeC = result.find(s => s.id === 'c');

      // Shape c is already at front (maxZIndex = 3), so no change
      expect(shapeC?.zIndex).toBe(3);
    });

    it('should keep other shapes unchanged when moving to front', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const result = autoUpdateZIndex(shapes, 'c');
      const shapeA = result.find(s => s.id === 'a');
      const shapeB = result.find(s => s.id === 'b');

      // Other shapes remain unchanged (no push-down needed!)
      expect(shapeA?.zIndex).toBe(1);
      expect(shapeB?.zIndex).toBe(2);
    });

    it('should not create duplicate z-indices', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const result = autoUpdateZIndex(shapes, 'b');
      const zIndices = result.map(s => s.zIndex);

      // Check for duplicates
      const hasDuplicates = zIndices.some((val, idx) => zIndices.indexOf(val) !== idx);
      expect(hasDuplicates).toBe(false);
    });

    it('should maintain all z-indices as positive integers', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const result = autoUpdateZIndex(shapes, 'a');

      result.forEach(shape => {
        expect(shape.zIndex).toBeGreaterThan(0);
        expect(Number.isInteger(shape.zIndex)).toBe(true);
      });
    });

    it('should handle already front shape correctly', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      // c is already at front (highest z-index = 3)
      const result = autoUpdateZIndex(shapes, 'c');
      const shapeC = result.find(s => s.id === 'c');

      // Should return unchanged since already at front
      expect(shapeC?.zIndex).toBe(3);
      expect(result.find(s => s.id === 'a')?.zIndex).toBe(1);
      expect(result.find(s => s.id === 'b')?.zIndex).toBe(2);
    });

    it('should return original array if shape not found', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2)
      ];

      const result = autoUpdateZIndex(shapes, 'nonexistent');

      expect(result).toEqual(shapes);
    });
  });

  describe('manualSetZIndex', () => {
    it('should set specific z-index correctly', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const result = manualSetZIndex(shapes, 'c', 1);
      const shapeC = result.find(s => s.id === 'c');

      expect(shapeC?.zIndex).toBe(1);
    });

    it('should trigger push-down recalculation when moving forward (toward front)', () => {
      // Shape A: 1 → 3 (moving from back toward front)
      // Shapes between (2, 3) should shift back by 1
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const result = manualSetZIndex(shapes, 'a', 3);
      const shapeA = result.find(s => s.id === 'a');
      const shapeB = result.find(s => s.id === 'b');
      const shapeC = result.find(s => s.id === 'c');

      expect(shapeA?.zIndex).toBe(3);
      expect(shapeB?.zIndex).toBe(1); // Shifted back from 2 to 1
      expect(shapeC?.zIndex).toBe(2); // Shifted back from 3 to 2
    });

    it('should trigger push-down recalculation when moving backward (toward back)', () => {
      // Shape C: 3 → 1 (moving from front toward back)
      // Shapes between (1, 2) should shift forward by 1
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const result = manualSetZIndex(shapes, 'c', 1);
      const shapeA = result.find(s => s.id === 'a');
      const shapeB = result.find(s => s.id === 'b');
      const shapeC = result.find(s => s.id === 'c');

      expect(shapeC?.zIndex).toBe(1);
      expect(shapeA?.zIndex).toBe(2); // Shifted forward from 1 to 2
      expect(shapeB?.zIndex).toBe(3); // Shifted forward from 2 to 3
    });

    it('should not create duplicate z-indices after manual set', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3),
        createMockRect('d', 4)
      ];

      const result = manualSetZIndex(shapes, 'c', 1);
      const zIndices = result.map(s => s.zIndex);

      const hasDuplicates = zIndices.some((val, idx) => zIndices.indexOf(val) !== idx);
      expect(hasDuplicates).toBe(false);
    });

    it('should reject z-index less than 1', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2)
      ];

      const result = manualSetZIndex(shapes, 'a', 0);

      expect(result).toEqual(shapes);
    });

    it('should handle no change when setting same z-index', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2)
      ];

      const result = manualSetZIndex(shapes, 'a', 1);

      expect(result).toEqual(shapes);
    });

    it('should return original array if shape not found', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2)
      ];

      const result = manualSetZIndex(shapes, 'nonexistent', 1);

      expect(result).toEqual(shapes);
    });
  });

  // recalculateAllZIndices function removed - no longer needed with new z-index convention
  // Higher z-index = front, lower z-index = back, no recalculation needed

  describe('validateZIndices', () => {
    it('should return valid for correct z-indices', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3)
      ];

      const validation = validateZIndices(shapes);

      expect(validation.isValid).toBe(true);
      expect(validation.duplicates).toEqual([]);
      expect(validation.gaps).toEqual([]);
    });

    it('should detect duplicate z-indices', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 2)
      ];

      const validation = validateZIndices(shapes);

      expect(validation.isValid).toBe(false);
      expect(validation.duplicates).toContain(2);
    });

    it('should detect gaps in z-indices (but allow them)', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 3),
        createMockRect('c', 4)
      ];

      const validation = validateZIndices(shapes);

      // Gaps are ALLOWED with new convention!
      expect(validation.isValid).toBe(true); // Still valid despite gap
      expect(validation.gaps).toContain(2); // Gap detected but not an error
    });

    it('should detect both duplicates and gaps', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 1),
        createMockRect('c', 4)
      ];

      const validation = validateZIndices(shapes);

      expect(validation.isValid).toBe(false);
      expect(validation.duplicates).toContain(1);
      expect(validation.gaps).toContain(2);
      expect(validation.gaps).toContain(3);
    });

    it('should handle empty array', () => {
      const validation = validateZIndices([]);

      expect(validation.isValid).toBe(true);
      expect(validation.duplicates).toEqual([]);
      expect(validation.gaps).toEqual([]);
    });
  });

  describe('stress testing', () => {
    it('should handle 50 shapes without duplicates', () => {
      const shapes: Rectangle[] = Array.from({ length: 50 }, (_, i) =>
        createMockRect(`shape-${i}`, i + 1)
      );

      // Move shape-24 (z-index 25) to front → becomes maxZIndex + 1 = 51
      const result = autoUpdateZIndex(shapes, 'shape-24');
      
      // Check no duplicates (gaps are allowed with new convention)
      const zIndices = result.map(s => s.zIndex);
      const hasDuplicates = zIndices.some((val, idx) => zIndices.indexOf(val) !== idx);
      expect(hasDuplicates).toBe(false);
      expect(result.find(s => s.id === 'shape-24')?.zIndex).toBe(51); // maxZIndex + 1
    });

    it('should handle multiple sequential auto-updates', () => {
      let shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3),
        createMockRect('d', 4)
      ];

      // Move shapes to front in sequence
      shapes = autoUpdateZIndex(shapes, 'd'); // d: 4 → 4 (already at front)
      shapes = autoUpdateZIndex(shapes, 'a'); // a: 1 → 5 (maxZIndex + 1)
      shapes = autoUpdateZIndex(shapes, 'c'); // c: 3 → 6 (maxZIndex + 1)

      // Check no duplicates (gaps allowed)
      const zIndices = shapes.map(s => s.zIndex);
      const hasDuplicates = zIndices.some((val, idx) => zIndices.indexOf(val) !== idx);
      expect(hasDuplicates).toBe(false);
      expect(shapes.find(s => s.id === 'c')?.zIndex).toBe(6); // Last moved to front
    });

    it('should handle multiple manual z-index changes', () => {
      let shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3),
        createMockRect('d', 4)
      ];

      shapes = manualSetZIndex(shapes, 'a', 3);
      shapes = manualSetZIndex(shapes, 'd', 1);
      shapes = manualSetZIndex(shapes, 'b', 4);

      // Check no duplicates (manual z-index uses atomic 3-phase approach)
      const zIndices = shapes.map(s => s.zIndex);
      const hasDuplicates = zIndices.some((val, idx) => zIndices.indexOf(val) !== idx);
      expect(hasDuplicates).toBe(false);
    });
  });
});

