/**
 * AI Plan Executor
 * 
 * Executes AI-generated plans on the client side using existing CanvasContext APIs.
 * Handles mapping from AI operations to canvas operations.
 */

import { AIOperation } from '../types/ai-tools';
import toast from 'react-hot-toast';

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
  deleteRectangle: (id: string) => Promise<void>; // Despite name, deletes ALL shape types
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
  onProgress?: (current: number, total: number, operation: AIOperation) => void,
  enableStreaming: boolean = true  // New parameter for streaming feedback
): Promise<string[]> {
  const createdIds: string[] = [];
  const milestones = [25, 50, 75, 100]; // Major milestones for toast notifications
  let lastMilestone = 0;

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];

    // Notify progress to update state
    if (onProgress) {
      onProgress(i + 1, operations.length, operation);
    }

    try {
      const resultIds = await executeOperation(operation, canvasContext);
      createdIds.push(...resultIds);
      
      // Log all operations in background for future chatbot platform
      if (enableStreaming) {
        const operationName = getOperationDisplayName(operation);
        const progressPercent = Math.round(((i + 1) / operations.length) * 100);
        console.log(`[AI Execution] ${operationName} (${i + 1}/${operations.length}) - ${progressPercent}% complete`);
        
        // Show toast only for major milestones (25%, 50%, 75%, 100%)
        if (operations.length > 3) {
          // Check if we've hit a new milestone (avoid function in loop warning)
          let currentMilestone = null;
          for (const milestone of milestones) {
            if (progressPercent >= milestone && milestone > lastMilestone) {
              currentMilestone = milestone;
              break;
            }
          }
          
          if (currentMilestone) {
            lastMilestone = currentMilestone;
            toast.success(`AI Progress: ${currentMilestone}% complete (${i + 1}/${operations.length})`, {
              duration: 1500,
              position: 'bottom-right',
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error executing operation ${operation.name}:`, error);
      
      // Show error toast for failed operation
      if (enableStreaming) {
        const operationName = getOperationDisplayName(operation);
        toast.error(`Failed: ${operationName}`, {
          duration: 3000,
        });
      }
      
      throw error;
    }
  }

  return createdIds;
}

/**
 * Helper function to get human-readable operation names
 * Used for logging and future chatbot response platform
 */
function getOperationDisplayName(operation: AIOperation): string {
  switch (operation.name) {
    case 'createRectangle':
      return `Created rectangle${(operation.args as any).name ? ` "${(operation.args as any).name}"` : ''}`;
    case 'createCircle':
      return `Created circle${(operation.args as any).name ? ` "${(operation.args as any).name}"` : ''}`;
    case 'createTriangle':
      return `Created triangle${(operation.args as any).name ? ` "${(operation.args as any).name}"` : ''}`;
    case 'createLine':
      return `Created line`;
    case 'createText':
      return `Created text${(operation.args as any).text ? ` "${(operation.args as any).text}"` : ''}`;
    case 'moveElement':
      return `Moved shape`;
    case 'resizeElement':
      return `Resized shape`;
    case 'rotateElement':
      return `Rotated shape`;
    case 'updateStyle':
      return `Updated style`;
    case 'arrangeElements':
      return `Arranged ${(operation.args as any).ids?.length || 0} shapes`;
    case 'createGrid':
      return `Created grid`;
    case 'deleteElement':
      return `Deleted shape`;
    default:
      return `Completed ${operation.name}`;
  }
}

/**
 * Helper to get ALL shapes from context
 * Note: Despite the name, context.rectangles contains ALL shape types
 * (rectangles, circles, triangles, lines, texts). They're distinguished by the 'type' property.
 */
function getAllShapes(context: CanvasContextMethods) {
  return context.rectangles; // This array contains all shape types
}

/**
 * Resolve a shape identifier to its actual UUID
 * The AI might reference shapes by name or by ID, we need to handle both.
 * Also supports fuzzy matching by type and color as a fallback.
 */
function resolveShapeId(identifier: string, context: CanvasContextMethods): string {
  const allShapes = getAllShapes(context);
  
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

  // Strategy 4: ENHANCED Fuzzy match with smart auto-selection
  // Example: "blue rectangle", "red circle", "green triangle"
  
  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Helper function to check if a color matches a semantic color name
  const isColorMatch = (hexColor: string, colorName: string): boolean => {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return false;

    const { r, g, b } = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    switch (colorName) {
      case 'red':
        return r > 150 && r > g * 1.5 && r > b * 1.5;
      case 'blue':
        return b > 150 && b > r * 1.2 && b > g * 1.2;
      case 'green':
        return g > 150 && g > r * 1.2 && g > b * 1.2;
      case 'yellow':
        return r > 180 && g > 180 && b < 100;
      case 'orange':
        return r > 200 && g > 100 && g < 180 && b < 100;
      case 'purple':
        return r > 100 && b > 100 && Math.abs(r - b) < 80 && g < Math.min(r, b) * 0.8;
      case 'pink':
        return r > 180 && b > 100 && g < 180;
      case 'gray':
      case 'grey':
        return max - min < 50; // Low saturation
      case 'black':
        return max < 80;
      case 'white':
        return min > 200;
      default:
        return false;
    }
  };

  // Extract color and type from identifier
  let matchedColor: string | null = null;
  let matchedType: string | null = null;

  // Find color in identifier
  const colorNames = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'black', 'white'];
  for (const colorName of colorNames) {
    if (lowerIdentifier.includes(colorName)) {
      matchedColor = colorName;
      break;
    }
  }

  // Find type in identifier
  const types = ['rectangle', 'circle', 'triangle', 'line', 'text'];
  for (const type of types) {
    if (lowerIdentifier.includes(type) || 
        (type === 'rectangle' && lowerIdentifier.includes('square'))) {
      matchedType = type;
      break;
    }
  }

  // If both color and type found, do smart matching
  if (matchedColor && matchedType) {
    const matchingShapes = allShapes.filter(shape => 
      isColorMatch(shape.color, matchedColor!) && shape.type === matchedType
    );

    if (matchingShapes.length === 1) {
      // ✅ PERFECT: Only one match, auto-select it
      console.log(`✅ SMART AUTO-SELECTION: "${identifier}" → "${matchingShapes[0].name || matchingShapes[0].id}" (ONLY ${matchedColor} ${matchedType})`);
      console.log(`  Shape color: ${matchingShapes[0].color}`);
      return matchingShapes[0].id;
    } else if (matchingShapes.length > 1) {
      // ⚠️ AMBIGUOUS: Multiple matches - log ALL candidates with colors
      console.warn(`⚠️ AMBIGUOUS: "${identifier}" matches ${matchingShapes.length} ${matchedColor} ${matchedType}s:`);
      matchingShapes.forEach((s, i) => {
        console.warn(`  ${i + 1}. "${s.name || s.id}" (${s.color}) at (${s.x}, ${s.y})`);
      });
      // Return first match but log warning
      console.warn(`  ⚠️ Using first match: "${matchingShapes[0].name || matchingShapes[0].id}"`);
      return matchingShapes[0].id;
    } else {
      // ❌ NOT FOUND - list all shapes to help debug
      console.error(`❌ No ${matchedColor} ${matchedType} found on canvas`);
      console.error(`Available ${matchedType}s:`, allShapes.filter(s => s.type === matchedType).map(s => ({
        name: s.name || s.id,
        color: s.color
      })));
      throw new Error(`No ${matchedColor} ${matchedType} found on canvas`);
    }
  }

  // Try just color match if type not specified
  if (matchedColor && !matchedType) {
    const matchingShapes = allShapes.filter(shape => isColorMatch(shape.color, matchedColor!));
    
    if (matchingShapes.length === 1) {
      console.log(`✅ SMART AUTO-SELECTION: "${identifier}" → "${matchingShapes[0].name}" (ONLY ${matchedColor} shape)`);
      return matchingShapes[0].id;
    } else if (matchingShapes.length > 1) {
      console.warn(`⚠️ Multiple ${matchedColor} shapes found (${matchingShapes.length}). Need type specification.`);
    }
  }

  // Try just type match if color not specified
  if (!matchedColor && matchedType) {
    const matchingShapes = allShapes.filter(shape => shape.type === matchedType);
    
    if (matchingShapes.length === 1) {
      console.log(`✅ SMART AUTO-SELECTION: "${identifier}" → "${matchingShapes[0].name}" (ONLY ${matchedType})`);
      return matchingShapes[0].id;
    } else if (matchingShapes.length > 1) {
      console.warn(`⚠️ Multiple ${matchedType}s found (${matchingShapes.length}). Need color specification.`);
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
      
      // STEP 1: Find and validate shape exists
      const shapeBefore = context.rectangles.find(r => r.id === resolvedId);
      if (!shapeBefore) {
        throw new Error(`Shape not found: ${(args as any).id}`);
      }
      
      const zIndexBefore = shapeBefore.zIndex;
      const maxZIndexBefore = Math.max(...context.rectangles.map(r => r.zIndex));
      
      console.log(`📊 Bringing to front: "${(shapeBefore as any).name || resolvedId}"`);
      console.log(`  Current z-index: ${zIndexBefore}, Max z-index: ${maxZIndexBefore}`);
      
      // Check if already at front
      if (zIndexBefore === maxZIndexBefore) {
        console.log(`ℹ️ Shape is already at front (z-index: ${zIndexBefore})`);
        return [];
      }
      
      // STEP 2: Execute bring to front (async operation with optimistic updates)
      await context.bringToFront(resolvedId);
      
      // STEP 3: Operation complete - manual buttons work, so trust the operation
      // Note: React state updates are async, verification would read stale state
      console.log(`✅ Brought "${(shapeBefore as any).name || resolvedId}" to front`);
      
      return [];
    }

    case 'sendToBack': {
      const resolvedId = resolveShapeId((args as any).id, context);
      
      const shapeBefore = context.rectangles.find(r => r.id === resolvedId);
      if (!shapeBefore) {
        throw new Error(`Shape not found: ${(args as any).id}`);
      }
      
      const zIndexBefore = shapeBefore.zIndex;
      const minZIndexBefore = Math.min(...context.rectangles.map(r => r.zIndex));
      
      console.log(`📊 Sending to back: "${(shapeBefore as any).name || resolvedId}"`);
      console.log(`  Current z-index: ${zIndexBefore}, Min z-index: ${minZIndexBefore}`);
      
      // Check if already at back
      if (zIndexBefore === minZIndexBefore) {
        console.log(`ℹ️ Shape is already at back (z-index: ${zIndexBefore})`);
        return [];
      }
      
      // Execute send to back (async operation with optimistic updates)
      await context.sendToBack(resolvedId);
      
      // Operation complete - manual buttons work, so trust the operation
      // Note: React state updates are async, verification would read stale state
      console.log(`✅ Sent "${(shapeBefore as any).name || resolvedId}" to back`);
      
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
  // STEP 1: Resolve the ID (might be a name or fuzzy match)
  const resolvedId = resolveShapeId(args.id, context);
  
  // STEP 2: Validate shape exists (check ALL shape types)
  const allShapes = getAllShapes(context);
  const shape = allShapes.find(s => s.id === resolvedId);
  if (!shape) {
    console.error(`[deleteElement] Shape not found: ${args.id}`);
    throw new Error(`Shape not found: ${args.id}`);
  }
  
  console.log(`🗑️ Deleting shape: "${(shape as any).name || resolvedId}" (type: ${shape.type})`);
  
  // STEP 3: Delete directly by ID (bypasses selection state issues)
  // Note: deleteRectangle works for ALL shape types despite its name
  await context.deleteRectangle(resolvedId);
  
  console.log(`✅ Deleted: "${(shape as any).name || resolvedId}"`);
}

/**
 * Execute deleteMultipleElements - bulk delete for performance
 */
async function executeDeleteMultipleElements(args: any, context: CanvasContextMethods): Promise<void> {
  const { ids } = args;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    console.error('❌ No shape IDs provided for deletion');
    throw new Error('No shapes specified for deletion');
  }

  console.log(`🗑️ Attempting to delete ${ids.length} shapes...`);
  
  // STEP 1: Resolve and validate all IDs (check ALL shape types)
  const resolvedIds: string[] = [];
  const failedIds: string[] = [];
  const allShapes = getAllShapes(context);
  
  for (const id of ids) {
    try {
      const resolvedId = resolveShapeId(id, context);
      const shape = allShapes.find(s => s.id === resolvedId);
      
      if (shape) {
        resolvedIds.push(resolvedId);
        console.log(`  ✅ Found: "${(shape as any).name || resolvedId}" (type: ${shape.type})`);
      } else {
        failedIds.push(id);
        console.warn(`  ⚠️ Not found: ${id}`);
      }
    } catch (error) {
      failedIds.push(id);
      console.error(`  ❌ Error resolving: ${id}`, error);
    }
  }
  
  if (resolvedIds.length === 0) {
    throw new Error(`None of the specified shapes were found. Tried: ${ids.join(', ')}`);
  }
  
  if (failedIds.length > 0) {
    console.warn(`⚠️ Could not find ${failedIds.length} shapes: ${failedIds.join(', ')}`);
  }
  
  // STEP 2: Delete each shape directly by ID (bypasses selection state issues)
  console.log(`🗑️ Deleting ${resolvedIds.length} shapes...`);
  const deletePromises = resolvedIds.map(id => context.deleteRectangle(id));
  await Promise.all(deletePromises);
  
  console.log(`✅ Deleted ${resolvedIds.length} shapes`);
}

