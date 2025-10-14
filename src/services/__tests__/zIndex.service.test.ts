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

      // With new convention: higher = front, so c should be maxZIndex + 1 = 4
      expect(shapeC?.zIndex).toBe(4);
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

      const result = autoUpdateZIndex(shapes, 'a');
      const shapeA = result.find(s => s.id === 'a');

      expect(shapeA?.zIndex).toBe(1);
      // Other shapes should maintain order
      expect(result.find(s => s.id === 'b')?.zIndex).toBe(2);
      expect(result.find(s => s.id === 'c')?.zIndex).toBe(3);
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

    it('should trigger push-down recalculation when moving forward', () => {
      // Shape C: 3 → 1, so shapes at 1 and 2 should become 2 and 3
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
      expect(shapeA?.zIndex).toBe(2);
      expect(shapeB?.zIndex).toBe(3);
    });

    it('should trigger push-down recalculation when moving backward', () => {
      // Shape A: 1 → 3, so shape at 2 should become 1, shape at 3 should become 2
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
      expect(shapeB?.zIndex).toBe(1);
      expect(shapeC?.zIndex).toBe(2);
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

  describe('recalculateAllZIndices', () => {
    it('should assign sequential z-indices starting from 1', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 5),
        createMockRect('b', 10),
        createMockRect('c', 3)
      ];

      const result = recalculateAllZIndices(shapes);
      const zIndices = result.map(s => s.zIndex).sort((a, b) => a - b);

      expect(zIndices).toEqual([1, 2, 3]);
    });

    it('should maintain relative order of shapes', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 5),
        createMockRect('b', 10),
        createMockRect('c', 3)
      ];

      const result = recalculateAllZIndices(shapes);

      // Shape c (originally 3) should be z-index 1
      // Shape a (originally 5) should be z-index 2
      // Shape b (originally 10) should be z-index 3
      expect(result.find(s => s.id === 'c')?.zIndex).toBe(1);
      expect(result.find(s => s.id === 'a')?.zIndex).toBe(2);
      expect(result.find(s => s.id === 'b')?.zIndex).toBe(3);
    });

    it('should remove duplicate z-indices', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 1),
        createMockRect('c', 2)
      ];

      const result = recalculateAllZIndices(shapes);
      const zIndices = result.map(s => s.zIndex);

      const hasDuplicates = zIndices.some((val, idx) => zIndices.indexOf(val) !== idx);
      expect(hasDuplicates).toBe(false);
    });

    it('should fill gaps in z-indices', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 5),
        createMockRect('c', 10)
      ];

      const result = recalculateAllZIndices(shapes);
      const zIndices = result.map(s => s.zIndex).sort((a, b) => a - b);

      expect(zIndices).toEqual([1, 2, 3]);
    });

    it('should handle empty array', () => {
      const result = recalculateAllZIndices([]);

      expect(result).toEqual([]);
    });

    it('should handle single shape', () => {
      const shapes: Rectangle[] = [createMockRect('a', 5)];

      const result = recalculateAllZIndices(shapes);

      expect(result[0].zIndex).toBe(1);
    });
  });

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

    it('should detect gaps in z-indices', () => {
      const shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 3),
        createMockRect('c', 4)
      ];

      const validation = validateZIndices(shapes);

      expect(validation.isValid).toBe(false);
      expect(validation.gaps).toContain(2);
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

      // Move shape 25 to front
      const result = autoUpdateZIndex(shapes, 'shape-24');
      const validation = validateZIndices(result);

      expect(validation.isValid).toBe(true);
      expect(result.find(s => s.id === 'shape-24')?.zIndex).toBe(1);
    });

    it('should handle multiple sequential auto-updates', () => {
      let shapes: Rectangle[] = [
        createMockRect('a', 1),
        createMockRect('b', 2),
        createMockRect('c', 3),
        createMockRect('d', 4)
      ];

      // Move shapes to front in sequence
      shapes = autoUpdateZIndex(shapes, 'd');
      shapes = autoUpdateZIndex(shapes, 'a');
      shapes = autoUpdateZIndex(shapes, 'c');

      const validation = validateZIndices(shapes);
      expect(validation.isValid).toBe(true);
      expect(shapes.find(s => s.id === 'c')?.zIndex).toBe(1);
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

      const validation = validateZIndices(shapes);
      expect(validation.isValid).toBe(true);
    });
  });
});

