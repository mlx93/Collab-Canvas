/**
 * AI Plan Executor
 * 
 * Executes AI-generated plans on the client side using existing CanvasContext APIs.
 * Handles mapping from AI operations to canvas operations.
 */

import { AIOperation } from '../types/ai-tools';

/**
 * Canvas context methods interface
 */
export interface CanvasContextMethods {
  addRectangle: (x: number, y: number, width: number, height: number, color: string) => Promise<string>;
  addCircle: (x: number, y: number, radius: number, color: string) => Promise<string>;
  addTriangle: (x: number, y: number, width: number, height: number, color: string) => Promise<string>;
  addLine: (x1: number, y1: number, x2: number, y2: number, color: string) => Promise<string>;
  addText: (x: number, y: number, text: string, fontSize: number, color: string) => Promise<string>;
  updateShape: (id: string, updates: any) => Promise<void>;
  deleteSelected: () => Promise<void>;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  selectShape: (id: string) => void;
  deselectAll: () => void;
  rectangles: any[];
}

/**
 * Execute a list of AI operations
 */
export async function executePlan(
  operations: AIOperation[],
  canvasContext: CanvasContextMethods,
  onProgress?: (current: number, total: number, operation: AIOperation) => void
): Promise<string[]> {
  const createdIds: string[] = [];

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];

    // Notify progress
    if (onProgress) {
      onProgress(i + 1, operations.length, operation);
    }

    try {
      const resultIds = await executeOperation(operation, canvasContext);
      createdIds.push(...resultIds);
    } catch (error) {
      console.error(`Error executing operation ${operation.name}:`, error);
      throw error;
    }
  }

  return createdIds;
}

/**
 * Resolve a shape identifier to its actual UUID
 * The AI might reference shapes by name or by ID, we need to handle both.
 * Also supports fuzzy matching by type and color as a fallback.
 */
function resolveShapeId(identifier: string, context: CanvasContextMethods): string {
  const allShapes = context.rectangles;
  
  // Strategy 1: Check if it's already a valid UUID
  const shapeById = allShapes.find(r => r.id === identifier);
  if (shapeById) {
    return identifier;
  }

  // Strategy 2: Try to find by exact name match
  const shapeByName = allShapes.find(r => r.name === identifier);
  if (shapeByName) {
    console.log(`✅ AI referenced shape by name "${identifier}", resolved to ID: ${shapeByName.id}`);
    return shapeByName.id;
  }

  // Strategy 3: Try case-insensitive name match
  const lowerIdentifier = identifier.toLowerCase();
  const shapeByNameCaseInsensitive = allShapes.find(r => 
    r.name && r.name.toLowerCase() === lowerIdentifier
  );
  if (shapeByNameCaseInsensitive) {
    console.log(`✅ AI referenced shape by name (case-insensitive) "${identifier}", resolved to ID: ${shapeByNameCaseInsensitive.id}`);
    return shapeByNameCaseInsensitive.id;
  }

  // Strategy 4: Fuzzy match - check if identifier contains shape type + color
  // Example: "blue rectangle", "red circle", "green triangle"
  const colorPatterns = {
    'red': /#(ef4444|dc2626|b91c1c|991b1b|7f1d1d|f87171|fca5a5)/i,
    'blue': /#(3b82f6|2563eb|1d4ed8|1e40af|1e3a8a|60a5fa|93c5fd)/i,
    'green': /#(10b981|059669|047857|065f46|064e3b|34d399|6ee7b7)/i,
    'yellow': /#(f59e0b|d97706|b45309|92400e|78350f|fbbf24|fcd34d)/i,
    'orange': /#(f97316|ea580c|c2410c|9a3412|7c2d12|fb923c|fdba74)/i,
    'purple': /#(8b5cf6|7c3aed|6d28d9|5b21b6|4c1d95|a78bfa|c4b5fd)/i,
    'pink': /#(ec4899|db2777|be185d|9d174d|831843|f472b6|f9a8d4)/i,
    'gray': /#(6b7280|4b5563|374151|1f2937|111827|9ca3af|d1d5db)/i,
  };

  for (const [colorName, colorPattern] of Object.entries(colorPatterns)) {
    if (lowerIdentifier.includes(colorName)) {
      // Found a color in the identifier, now look for matching shapes
      const matchingShapes = allShapes.filter(shape => {
        const hasMatchingColor = colorPattern.test(shape.color);
        
        // Check if identifier contains the shape type
        const hasMatchingType = lowerIdentifier.includes(shape.type);
        
        return hasMatchingColor && hasMatchingType;
      });

      if (matchingShapes.length === 1) {
        console.log(`✅ AI used fuzzy match "${identifier}", resolved to "${matchingShapes[0].name}" (ID: ${matchingShapes[0].id})`);
        return matchingShapes[0].id;
      } else if (matchingShapes.length > 1) {
        console.warn(`⚠️ Multiple shapes match "${identifier}": ${matchingShapes.map(s => s.name).join(', ')}. Using first match.`);
        return matchingShapes[0].id;
      }
    }
  }

  // Strategy 5: Try matching by type only (risky, only if one shape of that type exists)
  const typeMatch = allShapes.filter(s => s.type === identifier);
  if (typeMatch.length === 1) {
    console.log(`⚠️ AI referenced by type "${identifier}", resolved to "${typeMatch[0].name}" (ID: ${typeMatch[0].id}). This is risky!`);
    return typeMatch[0].id;
  } else if (typeMatch.length > 1) {
    console.error(`❌ Multiple ${identifier}s exist. AI should specify which one. Shapes: ${typeMatch.map(s => s.name).join(', ')}`);
  }

  // If still not found, return the original identifier and let it fail gracefully
  console.error(`❌ Could not resolve shape identifier: "${identifier}". Available shapes: ${allShapes.map(s => `"${s.name}" (${s.type})`).join(', ')}`);
  return identifier;
}

/**
 * Execute a single AI operation
 */
async function executeOperation(
  operation: AIOperation,
  context: CanvasContextMethods
): Promise<string[]> {
  const { name, args } = operation;

  switch (name) {
    case 'createRectangle':
      return [await executeCreateRectangle(args as any, context)];

    case 'createCircle':
      return [await executeCreateCircle(args as any, context)];

    case 'createTriangle':
      return [await executeCreateTriangle(args as any, context)];

    case 'createLine':
      return [await executeCreateLine(args as any, context)];

    case 'createText':
      return [await executeCreateText(args as any, context)];

    case 'moveElement':
      await executeMoveElement(args as any, context);
      return [];

    case 'resizeElement':
      await executeResizeElement(args as any, context);
      return [];

    case 'rotateElement':
      await executeRotateElement(args as any, context);
      return [];

    case 'updateStyle':
      await executeUpdateStyle(args as any, context);
      return [];

    case 'arrangeElements':
      await executeArrangeElements(args as any, context);
      return [];

    case 'createGrid':
      return await executeCreateGrid(args as any, context);

    case 'bringToFront': {
      const resolvedId = resolveShapeId((args as any).id, context);
      context.bringToFront(resolvedId);
      return [];
    }

    case 'sendToBack': {
      const resolvedId = resolveShapeId((args as any).id, context);
      context.sendToBack(resolvedId);
      return [];
    }

    case 'deleteElement':
      await executeDeleteElement(args as any, context);
      return [];

    case 'deleteMultipleElements':
      await executeDeleteMultipleElements(args as any, context);
      return [];

    case 'getCanvasState':
      // No-op, state is already provided
      return [];

    default:
      console.warn(`Unknown operation: ${name}`);
      return [];
  }
}

/**
 * Execute createRectangle
 */
async function executeCreateRectangle(args: any, context: CanvasContextMethods): Promise<string> {
  const id = await context.addRectangle(args.x, args.y, args.width, args.height, args.color);
  
  // Update additional properties if provided
  const updates: any = {};
  if (args.name) updates.name = args.name;
  if (args.opacity !== undefined) updates.opacity = args.opacity;
  
  if (Object.keys(updates).length > 0) {
    await context.updateShape(id, updates);
  }

  return id;
}

/**
 * Execute createCircle
 */
async function executeCreateCircle(args: any, context: CanvasContextMethods): Promise<string> {
  const id = await context.addCircle(args.x, args.y, args.radius, args.color);
  
  const updates: any = {};
  if (args.name) updates.name = args.name;
  if (args.opacity !== undefined) updates.opacity = args.opacity;
  
  if (Object.keys(updates).length > 0) {
    await context.updateShape(id, updates);
  }

  return id;
}

/**
 * Execute createTriangle
 */
async function executeCreateTriangle(args: any, context: CanvasContextMethods): Promise<string> {
  const id = await context.addTriangle(args.x, args.y, args.width, args.height, args.color);
  
  const updates: any = {};
  if (args.name) updates.name = args.name;
  if (args.opacity !== undefined) updates.opacity = args.opacity;
  
  if (Object.keys(updates).length > 0) {
    await context.updateShape(id, updates);
  }

  return id;
}

/**
 * Execute createLine
 */
async function executeCreateLine(args: any, context: CanvasContextMethods): Promise<string> {
  const id = await context.addLine(args.x1, args.y1, args.x2, args.y2, args.color);
  
  const updates: any = {};
  if (args.name) updates.name = args.name;
  if (args.opacity !== undefined) updates.opacity = args.opacity;
  
  if (Object.keys(updates).length > 0) {
    await context.updateShape(id, updates);
  }

  return id;
}

/**
 * Execute createText
 */
async function executeCreateText(args: any, context: CanvasContextMethods): Promise<string> {
  const id = await context.addText(args.x, args.y, args.text, args.fontSize, args.color);
  
  const updates: any = {};
  if (args.name) updates.name = args.name;
  if (args.opacity !== undefined) updates.opacity = args.opacity;
  
  if (Object.keys(updates).length > 0) {
    await context.updateShape(id, updates);
  }

  return id;
}

/**
 * Execute moveElement
 */
async function executeMoveElement(args: any, context: CanvasContextMethods): Promise<void> {
  const resolvedId = resolveShapeId(args.id, context);
  await context.updateShape(resolvedId, { x: args.x, y: args.y });
}

/**
 * Execute resizeElement
 */
async function executeResizeElement(args: any, context: CanvasContextMethods): Promise<void> {
  const resolvedId = resolveShapeId(args.id, context);
  const updates: any = {};
  if (args.width !== undefined) updates.width = args.width;
  if (args.height !== undefined) updates.height = args.height;
  if (args.radius !== undefined) updates.radius = args.radius;
  if (args.x2 !== undefined) updates.x2 = args.x2;
  if (args.y2 !== undefined) updates.y2 = args.y2;

  await context.updateShape(resolvedId, updates);
}

/**
 * Execute rotateElement
 */
async function executeRotateElement(args: any, context: CanvasContextMethods): Promise<void> {
  const resolvedId = resolveShapeId(args.id, context);
  await context.updateShape(resolvedId, { rotation: args.rotation });
}

/**
 * Execute updateStyle
 */
async function executeUpdateStyle(args: any, context: CanvasContextMethods): Promise<void> {
  const resolvedId = resolveShapeId(args.id, context);
  const updates: any = {};
  if (args.color !== undefined) updates.color = args.color;
  if (args.opacity !== undefined) updates.opacity = args.opacity;
  if (args.visible !== undefined) updates.visible = args.visible;
  if (args.locked !== undefined) updates.locked = args.locked;
  if (args.name !== undefined) updates.name = args.name;

  await context.updateShape(resolvedId, updates);
}

/**
 * Execute arrangeElements
 */
async function executeArrangeElements(args: any, context: CanvasContextMethods): Promise<void> {
  const { ids, arrangement, spacing = 20 } = args;

  // Resolve all IDs (might be names)
  const resolvedIds = ids.map((id: string) => resolveShapeId(id, context));

  // Get shapes by resolved IDs
  const shapes = resolvedIds.map((id: string) => 
    context.rectangles.find(r => r.id === id)
  ).filter(Boolean);

  if (shapes.length === 0) return;

  // Calculate positions based on arrangement
  if (arrangement === 'horizontal') {
    let currentX = shapes[0].x;
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      if (i > 0) {
        await context.updateShape(shape.id, { x: currentX });
      }
      const width = shape.width || (shape.radius ? shape.radius * 2 : 100);
      currentX += width + spacing;
    }
  } else if (arrangement === 'vertical') {
    let currentY = shapes[0].y;
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      if (i > 0) {
        await context.updateShape(shape.id, { y: currentY });
      }
      const height = shape.height || (shape.radius ? shape.radius * 2 : 100);
      currentY += height + spacing;
    }
  }
}

/**
 * Execute createGrid
 */
async function executeCreateGrid(args: any, context: CanvasContextMethods): Promise<string[]> {
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

  const createdIds: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (cellWidth + spacing);
      const y = startY + row * (cellHeight + spacing);
      const name = `${namePrefix} ${row + 1}-${col + 1}`;

      let id: string;
      if (type === 'circle') {
        const radius = Math.min(cellWidth, cellHeight) / 2;
        id = await context.addCircle(x + cellWidth / 2, y + cellHeight / 2, radius, color);
      } else if (type === 'triangle') {
        id = await context.addTriangle(x, y, cellWidth, cellHeight, color);
      } else {
        // Default to rectangle
        id = await context.addRectangle(x, y, cellWidth, cellHeight, color);
      }

      // Set name
      await context.updateShape(id, { name });
      createdIds.push(id);
    }
  }

  return createdIds;
}

/**
 * Execute deleteElement
 */
async function executeDeleteElement(args: any, context: CanvasContextMethods): Promise<void> {
  // Resolve the ID (might be a name)
  const resolvedId = resolveShapeId(args.id, context);
  // Select the shape first, then delete
  context.selectShape(resolvedId);
  await context.deleteSelected();
}

/**
 * Execute deleteMultipleElements - bulk delete for performance
 */
async function executeDeleteMultipleElements(args: any, context: CanvasContextMethods): Promise<void> {
  const { ids } = args;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    console.warn('deleteMultipleElements called with no IDs');
    return;
  }

  // Resolve all IDs (might be names)
  const resolvedIds = ids.map((id: string) => resolveShapeId(id, context)).filter(Boolean);
  
  console.log(`Deleting ${resolvedIds.length} shapes in bulk:`, resolvedIds);
  
  // CRITICAL FIX: Select ALL shapes first, THEN delete all at once
  // Clear current selection first
  context.deselectAll();
  
  // Select all shapes to be deleted
  for (const resolvedId of resolvedIds) {
    context.selectShape(resolvedId);
  }
  
  // Small delay to let selection state update
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Now delete all selected shapes at once
  await context.deleteSelected();
  
  console.log(`✅ Successfully deleted ${resolvedIds.length} shapes`);
}

