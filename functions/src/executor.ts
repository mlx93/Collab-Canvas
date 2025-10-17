/**
 * Server-Side Operation Executor
 * 
 * Executes AI operations directly on Firestore for complex multi-step commands.
 * This ensures atomic execution and better concurrency control.
 */

import * as admin from 'firebase-admin';
import { AIOperation } from './types';

/**
 * Execute a list of operations server-side
 */
export async function executeOperations(
  operations: AIOperation[],
  canvasId: string,
  userEmail: string
): Promise<{
  operationsApplied: number;
  shapeIds: string[];
  timestamp: number;
}> {
  const db = admin.firestore();
  const batch = db.batch();
  const shapeIds: string[] = [];
  const timestamp = Date.now();

  // Get reference to shapes collection
  const shapesRef = db
    .collection('canvases')
    .doc(canvasId)
    .collection('shapes');

  // Get current max z-index
  const shapesSnapshot = await shapesRef.get();
  let maxZIndex = 0;
  shapesSnapshot.forEach(doc => {
    const shape = doc.data();
    if (shape.zIndex && shape.zIndex > maxZIndex) {
      maxZIndex = shape.zIndex;
    }
  });

  // Process each operation
  for (const operation of operations) {
    try {
      switch (operation.name) {
        case 'createRectangle':
          await executeCreateRectangle(operation.args as any, batch, shapesRef, userEmail, maxZIndex, shapeIds);
          maxZIndex++;
          break;

        case 'createCircle':
          await executeCreateCircle(operation.args as any, batch, shapesRef, userEmail, maxZIndex, shapeIds);
          maxZIndex++;
          break;

        case 'createTriangle':
          await executeCreateTriangle(operation.args as any, batch, shapesRef, userEmail, maxZIndex, shapeIds);
          maxZIndex++;
          break;

        case 'createLine':
          await executeCreateLine(operation.args as any, batch, shapesRef, userEmail, maxZIndex, shapeIds);
          maxZIndex++;
          break;

        case 'createText':
          await executeCreateText(operation.args as any, batch, shapesRef, userEmail, maxZIndex, shapeIds);
          maxZIndex++;
          break;

        case 'createGrid':
          await executeCreateGrid(operation.args as any, batch, shapesRef, userEmail, maxZIndex, shapeIds);
          maxZIndex += (operation.args as any).rows * (operation.args as any).cols;
          break;

        default:
          console.warn(`Unsupported server-side operation: ${operation.name}`);
      }
    } catch (error) {
      console.error(`Error executing operation ${operation.name}:`, error);
      throw error;
    }
  }

  // Commit batch
  await batch.commit();

  return {
    operationsApplied: operations.length,
    shapeIds,
    timestamp,
  };
}

/**
 * Execute createRectangle operation
 */
async function executeCreateRectangle(
  args: any,
  batch: FirebaseFirestore.WriteBatch,
  shapesRef: FirebaseFirestore.CollectionReference,
  userEmail: string,
  zIndex: number,
  shapeIds: string[]
): Promise<void> {
  const shapeId = shapesRef.doc().id;
  const shapeData = {
    type: 'rectangle',
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    color: args.color,
    name: args.name || `Rectangle ${shapeIds.length + 1}`,
    opacity: args.opacity ?? 1,
    rotation: 0,
    visible: true,
    locked: false,
    zIndex: zIndex + 1,
    createdBy: userEmail,
    lastModifiedBy: userEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastModified: admin.firestore.FieldValue.serverTimestamp(),
    ai: true, // Tag as AI-created
  };

  batch.set(shapesRef.doc(shapeId), shapeData);
  shapeIds.push(shapeId);
}

/**
 * Execute createCircle operation
 */
async function executeCreateCircle(
  args: any,
  batch: FirebaseFirestore.WriteBatch,
  shapesRef: FirebaseFirestore.CollectionReference,
  userEmail: string,
  zIndex: number,
  shapeIds: string[]
): Promise<void> {
  const shapeId = shapesRef.doc().id;
  const shapeData = {
    type: 'circle',
    x: args.x,
    y: args.y,
    radius: args.radius,
    color: args.color,
    name: args.name || `Circle ${shapeIds.length + 1}`,
    opacity: args.opacity ?? 1,
    rotation: 0,
    visible: true,
    locked: false,
    zIndex: zIndex + 1,
    createdBy: userEmail,
    lastModifiedBy: userEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastModified: admin.firestore.FieldValue.serverTimestamp(),
    ai: true,
  };

  batch.set(shapesRef.doc(shapeId), shapeData);
  shapeIds.push(shapeId);
}

/**
 * Execute createTriangle operation
 */
async function executeCreateTriangle(
  args: any,
  batch: FirebaseFirestore.WriteBatch,
  shapesRef: FirebaseFirestore.CollectionReference,
  userEmail: string,
  zIndex: number,
  shapeIds: string[]
): Promise<void> {
  const shapeId = shapesRef.doc().id;
  const shapeData = {
    type: 'triangle',
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    color: args.color,
    name: args.name || `Triangle ${shapeIds.length + 1}`,
    opacity: args.opacity ?? 1,
    rotation: 0,
    visible: true,
    locked: false,
    zIndex: zIndex + 1,
    createdBy: userEmail,
    lastModifiedBy: userEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastModified: admin.firestore.FieldValue.serverTimestamp(),
    ai: true,
  };

  batch.set(shapesRef.doc(shapeId), shapeData);
  shapeIds.push(shapeId);
}

/**
 * Execute createLine operation
 */
async function executeCreateLine(
  args: any,
  batch: FirebaseFirestore.WriteBatch,
  shapesRef: FirebaseFirestore.CollectionReference,
  userEmail: string,
  zIndex: number,
  shapeIds: string[]
): Promise<void> {
  const shapeId = shapesRef.doc().id;
  const shapeData = {
    type: 'line',
    x: args.x1,
    y: args.y1,
    x2: args.x2,
    y2: args.y2,
    color: args.color,
    name: args.name || `Line ${shapeIds.length + 1}`,
    opacity: args.opacity ?? 1,
    rotation: 0,
    visible: true,
    locked: false,
    zIndex: zIndex + 1,
    createdBy: userEmail,
    lastModifiedBy: userEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastModified: admin.firestore.FieldValue.serverTimestamp(),
    ai: true,
  };

  batch.set(shapesRef.doc(shapeId), shapeData);
  shapeIds.push(shapeId);
}

/**
 * Execute createText operation
 */
async function executeCreateText(
  args: any,
  batch: FirebaseFirestore.WriteBatch,
  shapesRef: FirebaseFirestore.CollectionReference,
  userEmail: string,
  zIndex: number,
  shapeIds: string[]
): Promise<void> {
  const shapeId = shapesRef.doc().id;
  const shapeData = {
    type: 'text',
    text: args.text,
    x: args.x,
    y: args.y,
    fontSize: args.fontSize,
    width: 200, // Default width for text
    height: args.fontSize * 1.5, // Default height based on font size
    color: args.color,
    name: args.name || `Text ${shapeIds.length + 1}`,
    opacity: args.opacity ?? 1,
    rotation: 0,
    visible: true,
    locked: false,
    zIndex: zIndex + 1,
    createdBy: userEmail,
    lastModifiedBy: userEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastModified: admin.firestore.FieldValue.serverTimestamp(),
    ai: true,
  };

  batch.set(shapesRef.doc(shapeId), shapeData);
  shapeIds.push(shapeId);
}

/**
 * Execute createGrid operation
 */
async function executeCreateGrid(
  args: any,
  batch: FirebaseFirestore.WriteBatch,
  shapesRef: FirebaseFirestore.CollectionReference,
  userEmail: string,
  zIndex: number,
  shapeIds: string[]
): Promise<void> {
  const {
    rows,
    cols,
    cellWidth,
    cellHeight,
    spacing = 10,
    startX = 100,
    startY = 100,
    color = '#3b82f6',
    type = 'rectangle',
    namePrefix = 'Grid',
  } = args;

  let currentZIndex = zIndex + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (cellWidth + spacing);
      const y = startY + row * (cellHeight + spacing);
      const name = `${namePrefix} ${row + 1}-${col + 1}`;

      if (type === 'rectangle') {
        await executeCreateRectangle(
          { x, y, width: cellWidth, height: cellHeight, color, name },
          batch,
          shapesRef,
          userEmail,
          currentZIndex - 1,
          shapeIds
        );
      } else if (type === 'circle') {
        const radius = Math.min(cellWidth, cellHeight) / 2;
        await executeCreateCircle(
          { x: x + cellWidth / 2, y: y + cellHeight / 2, radius, color, name },
          batch,
          shapesRef,
          userEmail,
          currentZIndex - 1,
          shapeIds
        );
      } else if (type === 'triangle') {
        await executeCreateTriangle(
          { x, y, width: cellWidth, height: cellHeight, color, name },
          batch,
          shapesRef,
          userEmail,
          currentZIndex - 1,
          shapeIds
        );
      }

      currentZIndex++;
    }
  }
}

