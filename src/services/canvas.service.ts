// Canvas service for Firestore operations with retry logic
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from './firebase';
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
 * NOTE: Queries Firestore for maxZIndex to ensure new rectangle appears at front
 */
export async function createRectangle(
  rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'>
): Promise<void> {
  const shapeId = doc(getShapesCollection()).id; // Generate unique ID
  const shapeRef = getShapeDoc(shapeId);

  // Query existing shapes to find maxZIndex (higher z-index = front)
  const shapesSnapshot = await retryOperation(
    () => getDocs(query(getShapesCollection(), orderBy('zIndex', 'desc'), limit(1))),
    'Query max z-index'
  );
  
  const maxZIndex = shapesSnapshot.empty 
    ? 0 
    : shapesSnapshot.docs[0].data().zIndex;

  const rectangleData = {
    id: shapeId,
    ...rectangle,
    zIndex: maxZIndex + 1, // New rectangles go to front (higher = front)
    createdAt: Timestamp.now(),
    lastModified: Timestamp.now(),
    lastModifiedBy: rectangle.lastModifiedBy ?? rectangle.createdBy,
  };

  await retryOperation(
    () => setDoc(shapeRef, rectangleData),
    'Create rectangle'
  );
}

/**
 * Update a rectangle in Firestore
 * Auto-updates z-index to maxZIndex + 1 on any edit (brings to front)
 */
export async function updateRectangle(
  shapeId: string,
  updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>
): Promise<void> {
  const shapeRef = getShapeDoc(shapeId);

  const updateData: any = {
    ...updates,
    lastModified: Timestamp.now(),
  };

  // Ensure lastModifiedBy is always set to the current user's email when available
  const currentEmail = auth.currentUser?.email;
  if (currentEmail) {
    updateData.lastModifiedBy = currentEmail;
  } else if (!updateData.lastModifiedBy) {
    // As a fallback (should rarely happen), leave it to existing rule checks
    // or let Firestore reject if required
  }

  // If this is a position/size/color update (not just z-index), auto-set z-index to front
  // BUT only if z-index is not explicitly provided in the update
  if (updates.zIndex === undefined && 
      (updates.x !== undefined || updates.y !== undefined || 
       updates.width !== undefined || updates.height !== undefined || 
       updates.color !== undefined)) {
    // Query for maxZIndex to bring edited shape to front (higher = front)
    const shapesSnapshot = await retryOperation(
      () => getDocs(query(getShapesCollection(), orderBy('zIndex', 'desc'), limit(1))),
      'Query max z-index'
    );
    
    const maxZIndex = shapesSnapshot.empty 
      ? 0 
      : shapesSnapshot.docs[0].data().zIndex;
    
    updateData.zIndex = maxZIndex + 1;
  }

  await retryOperation(
    () => updateDoc(shapeRef, updateData),
    'Update rectangle'
  );
}

// Simple mutex to prevent concurrent z-index updates
let zIndexUpdateInProgress = false;

/**
 * Manually set z-index with push-down recalculation
 */
export async function updateZIndex(shapeId: string, newZIndex: number): Promise<void> {
  // Check authentication
  if (!auth.currentUser?.email) {
    throw new Error('User must be authenticated to update z-index');
  }
  
  // Prevent concurrent z-index updates
  if (zIndexUpdateInProgress) {
    // Wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return updateZIndex(shapeId, newZIndex);
  }
  
  zIndexUpdateInProgress = true;
  
  try {
    await retryOperation(async () => {
    // Get all shapes to recalculate z-indices
    const shapesQuery = query(getShapesCollection());
    const snapshot = await getDocs(shapesQuery);

    const batch = writeBatch(db);
    const shapes: Rectangle[] = [];

    snapshot.forEach((docSnap) => {
      shapes.push(docSnap.data() as Rectangle);
    });

    // Find the target shape
    const targetShape = shapes.find((s) => s.id === shapeId);
    if (!targetShape) {
      throw new Error(`Shape ${shapeId} not found`);
    }

    const oldZIndex = targetShape.zIndex;
    if (oldZIndex === newZIndex) {
      return; // nothing to do
    }

    // NEW CONVENTION: Higher z-index = front, lower = back
    // Atomic 3-phase approach to avoid temporary conflicts:
    // Phase 1: Move target to a temporary high value (maxZIndex + 1000)
    // Phase 2: Shift other shapes to make room at target z-index
    // Phase 3: Move target to final desired z-index

    const maxZIndex = shapes.length > 0 ? Math.max(...shapes.map(s => s.zIndex)) : 0;
    const TEMP_HIGH_VALUE = maxZIndex + 1000;

    // Phase 1: target → TEMP_HIGH_VALUE
    batch.update(getShapeDoc(shapeId), {
      zIndex: TEMP_HIGH_VALUE,
      lastModified: Timestamp.now(),
      lastModifiedBy: auth.currentUser!.email,
    });

    // Phase 2: shift other shapes to make room
    shapes.forEach((shape) => {
      if (shape.id === shapeId) return;

      let updatedZIndex = shape.zIndex;
      if (newZIndex > oldZIndex) {
        // Moving target forward (toward front)
        // Shapes in (oldZIndex, newZIndex] shift back by 1
        if (shape.zIndex > oldZIndex && shape.zIndex <= newZIndex) {
          updatedZIndex = shape.zIndex - 1;
        }
      } else {
        // Moving target backward (toward back)
        // Shapes in [newZIndex, oldZIndex) shift forward by 1
        if (shape.zIndex >= newZIndex && shape.zIndex < oldZIndex) {
          updatedZIndex = shape.zIndex + 1;
        }
      }

      if (updatedZIndex !== shape.zIndex) {
        batch.update(getShapeDoc(shape.id), {
          zIndex: updatedZIndex,
          lastModified: Timestamp.now(),
          lastModifiedBy: auth.currentUser!.email,
        });
      }
    });

    // Phase 3: target → newZIndex
    batch.update(getShapeDoc(shapeId), {
      zIndex: newZIndex,
      lastModified: Timestamp.now(),
      lastModifiedBy: auth.currentUser!.email,
    });

    await batch.commit();
  }, 'Update z-index');
  } finally {
    zIndexUpdateInProgress = false;
  }
}

/**
 * Batch update z-indices for multiple shapes (used when reordering in layers panel)
 * This avoids race conditions from multiple simultaneous updateZIndex calls
 */
export async function batchUpdateZIndices(updates: Record<string, number>): Promise<void> {
  // Check authentication
  if (!auth.currentUser?.email) {
    throw new Error('User must be authenticated to update z-indices');
  }
  
  await retryOperation(async () => {
    const batch = writeBatch(db);
    
    // Update each shape's z-index
    Object.entries(updates).forEach(([shapeId, newZIndex]) => {
      batch.update(getShapeDoc(shapeId), {
        zIndex: newZIndex,
        lastModified: Timestamp.now(),
        lastModifiedBy: auth.currentUser!.email,
      });
    });
    
    await batch.commit();
  }, 'Batch update z-indices');
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
        
        // Build shape object with all possible fields (TypeScript will be happy with 'as any')
        const shape: any = {
          id: doc.id,
          type: data.type || 'rectangle', // Default to rectangle for backward compatibility
          x: data.x,
          y: data.y,
          color: data.color,
          rotation: data.rotation ?? 0, // Default rotation for existing shapes
          opacity: data.opacity ?? 1, // Default opacity for existing shapes
          zIndex: data.zIndex,
          visible: data.visible ?? true,
          locked: data.locked ?? false,
          name: data.name, // Custom name for shape (editable in layers panel)
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          lastModifiedBy: data.lastModifiedBy,
          lastModified: data.lastModified,
        };
        
        // Add shape-specific properties
        if (data.type === 'rectangle' || !data.type) {
          shape.width = data.width;
          shape.height = data.height;
        } else if (data.type === 'circle') {
          shape.radius = data.radius;
        } else if (data.type === 'triangle') {
          shape.width = data.width;
          shape.height = data.height;
        } else if (data.type === 'line') {
          shape.x2 = data.x2;
          shape.y2 = data.y2;
          shape.strokeWidth = data.strokeWidth;
        } else if (data.type === 'text') {
          shape.text = data.text;
          shape.width = data.width;
          shape.height = data.height;
          shape.fontSize = data.fontSize;
          shape.fontFamily = data.fontFamily;
          shape.fontWeight = data.fontWeight;
          shape.fontStyle = data.fontStyle;
          shape.backgroundColor = data.backgroundColor;
          shape.textColor = data.textColor;
          shape.borderColor = data.borderColor;
        }
        
        shapes.push(shape);
      });

      // Sort by z-index ascending for rendering order
      // Lower z-index renders first (back), higher z-index last (front)
      shapes.sort((a, b) => a.zIndex - b.zIndex);

      callback(shapes);
    },
    (error) => {
      console.error('Error subscribing to shapes:', error);
      toast.error('Lost connection to database. Reconnecting...');
    }
  );

  return unsubscribe;
}
