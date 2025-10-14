// Canvas service for Firestore operations with retry logic
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  Timestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Rectangle } from '../types/canvas.types';
import { CANVAS_ID } from '../utils/constants';
import toast from 'react-hot-toast';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [100, 300, 900]; // Exponential backoff: 100ms, 300ms, 900ms

/**
 * Retry wrapper for Firestore operations with exponential backoff
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`${operationName} attempt ${attempt + 1} failed:`, error);

      // If not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }

  // All retries failed
  console.error(`${operationName} failed after ${MAX_RETRIES} attempts:`, lastError);
  toast.error(`Failed to ${operationName.toLowerCase()}. Please try again.`);
  throw lastError;
}

/**
 * Get the shapes collection reference
 */
function getShapesCollection() {
  return collection(db, `canvases/${CANVAS_ID}/shapes`);
}

/**
 * Get a shape document reference
 */
function getShapeDoc(shapeId: string) {
  return doc(db, `canvases/${CANVAS_ID}/shapes`, shapeId);
}

/**
 * Create a new rectangle in Firestore
 */
export async function createRectangle(
  rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'>
): Promise<void> {
  const shapeId = doc(getShapesCollection()).id; // Generate unique ID
  const shapeRef = getShapeDoc(shapeId);

  const rectangleData = {
    id: shapeId,
    ...rectangle,
    zIndex: 1, // New rectangles start at front
    createdAt: Timestamp.now(),
    lastModified: Timestamp.now(),
  };

  await retryOperation(
    () => setDoc(shapeRef, rectangleData),
    'Create rectangle'
  );
}

/**
 * Update a rectangle in Firestore
 * Auto-updates z-index to 1 on any edit
 */
export async function updateRectangle(
  shapeId: string,
  updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>
): Promise<void> {
  const shapeRef = getShapeDoc(shapeId);

  const updateData = {
    ...updates,
    lastModified: Timestamp.now(),
  };

  // If this is a position/size/color update (not just z-index), auto-set z-index to 1
  if (updates.x !== undefined || updates.y !== undefined || 
      updates.width !== undefined || updates.height !== undefined || 
      updates.color !== undefined) {
    updateData.zIndex = 1;
  }

  await retryOperation(
    () => updateDoc(shapeRef, updateData),
    'Update rectangle'
  );
}

/**
 * Manually set z-index with push-down recalculation
 */
export async function updateZIndex(shapeId: string, newZIndex: number): Promise<void> {
  await retryOperation(async () => {
    // Get all shapes to recalculate z-indices
    const shapesQuery = query(getShapesCollection());
    const snapshot = await getDocs(shapesQuery);

    const batch = writeBatch(db);
    const shapes: Rectangle[] = [];

    snapshot.forEach((doc) => {
      shapes.push(doc.data() as Rectangle);
    });

    // Find the target shape
    const targetShape = shapes.find((s) => s.id === shapeId);
    if (!targetShape) {
      throw new Error(`Shape ${shapeId} not found`);
    }

    const oldZIndex = targetShape.zIndex;

    // Recalculate z-indices with push-down logic
    shapes.forEach((shape) => {
      let updatedZIndex = shape.zIndex;

      if (shape.id === shapeId) {
        // Set target shape to new z-index
        updatedZIndex = newZIndex;
      } else if (newZIndex < oldZIndex) {
        // Moving target forward (lower number = front)
        // Push shapes in range [newZIndex, oldZIndex) back by 1
        if (shape.zIndex >= newZIndex && shape.zIndex < oldZIndex) {
          updatedZIndex = shape.zIndex + 1;
        }
      } else if (newZIndex > oldZIndex) {
        // Moving target backward (higher number = back)
        // Pull shapes in range (oldZIndex, newZIndex] forward by 1
        if (shape.zIndex > oldZIndex && shape.zIndex <= newZIndex) {
          updatedZIndex = shape.zIndex - 1;
        }
      }

      // Update if z-index changed
      if (updatedZIndex !== shape.zIndex) {
        const shapeRef = getShapeDoc(shape.id);
        batch.update(shapeRef, {
          zIndex: updatedZIndex,
          lastModified: Timestamp.now(),
        });
      }
    });

    await batch.commit();
  }, 'Update z-index');
}

/**
 * Delete a rectangle from Firestore
 */
export async function deleteRectangle(shapeId: string): Promise<void> {
  const shapeRef = getShapeDoc(shapeId);

  await retryOperation(
    () => deleteDoc(shapeRef),
    'Delete rectangle'
  );
}

/**
 * Subscribe to real-time shape updates
 * @param callback - Called with updated shapes array
 * @returns Unsubscribe function
 */
export function subscribeToShapes(
  callback: (shapes: Rectangle[]) => void
): () => void {
  const shapesQuery = query(getShapesCollection());

  const unsubscribe = onSnapshot(
    shapesQuery,
    (snapshot) => {
      const shapes: Rectangle[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        shapes.push({
          id: doc.id,
          x: data.x,
          y: data.y,
          width: data.width,
          height: data.height,
          color: data.color,
          zIndex: data.zIndex,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          lastModifiedBy: data.lastModifiedBy,
          lastModified: data.lastModified,
        });
      });

      // Sort by z-index (1 = front, higher = back) for rendering order
      shapes.sort((a, b) => b.zIndex - a.zIndex);

      callback(shapes);
    },
    (error) => {
      console.error('Error subscribing to shapes:', error);
      toast.error('Lost connection to database. Reconnecting...');
    }
  );

  return unsubscribe;
}
