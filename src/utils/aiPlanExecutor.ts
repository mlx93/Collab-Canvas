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

  // Strategy 4: ENHANCED Fuzzy match with smart auto-selection
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

  // Extract color and type from identifier
  let matchedColor: string | null = null;
  let matchedType: string | null = null;

  // Find color in identifier
  for (const [colorName, colorPattern] of Object.entries(colorPatterns)) {
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
    const colorPattern = colorPatterns[matchedColor as keyof typeof colorPatterns];
    const matchingShapes = allShapes.filter(shape => 
      colorPattern.test(shape.color) && shape.type === matchedType
    );

    if (matchingShapes.length === 1) {
      // ✅ PERFECT: Only one match, auto-select it
      console.log(`✅ SMART AUTO-SELECTION: "${identifier}" → "${matchingShapes[0].name}" (ONLY ${matchedColor} ${matchedType})`);
      return matchingShapes[0].id;
    } else if (matchingShapes.length > 1) {
      // ⚠️ AMBIGUOUS: Multiple matches
      console.warn(`⚠️ AMBIGUOUS: "${identifier}" matches ${matchingShapes.length} shapes:`);
      matchingShapes.forEach((s, i) => {
        console.warn(`  ${i + 1}. "${s.name}" at (${s.x}, ${s.y})`);
      });
      // Return first match but log warning
      console.warn(`  ⚠️ Using first match: "${matchingShapes[0].name}"`);
      return matchingShapes[0].id;
    } else {
      // ❌ NOT FOUND
      throw new Error(`No ${matchedColor} ${matchedType} found on canvas`);
    }
  }

  // Try just color match if type not specified
  if (matchedColor && !matchedType) {
    const colorPattern = colorPatterns[matchedColor as keyof typeof colorPatterns];
    const matchingShapes = allShapes.filter(shape => colorPattern.test(shape.color));
    
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
      
      // STEP 2: Execute bring to front
      context.bringToFront(resolvedId);
      
      // STEP 3: Wait for state update (CRITICAL!)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 4: Verify z-index actually changed
      const shapeAfter = context.rectangles.find(r => r.id === resolvedId);
      if (!shapeAfter) {
        throw new Error(`Shape disappeared after bringToFront: ${(args as any).id}`);
      }
      
      const zIndexAfter = shapeAfter.zIndex;
      
      console.log(`  New z-index: ${zIndexAfter}`);
      
      // STEP 5: Validate success
      if (zIndexAfter <= zIndexBefore) {
        console.error('❌ Z-index did not increase!');
        throw new Error(`Failed to bring shape to front: z-index remained ${zIndexAfter}`);
      }
      
      console.log(`✅ Successfully brought "${(shapeBefore as any).name || resolvedId}" to front (${zIndexBefore} → ${zIndexAfter})`);
      
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
      
      context.sendToBack(resolvedId);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const shapeAfter = context.rectangles.find(r => r.id === resolvedId);
      if (!shapeAfter) {
        throw new Error(`Shape disappeared after sendToBack: ${(args as any).id}`);
      }
      
      const zIndexAfter = shapeAfter.zIndex;
      
      console.log(`  New z-index: ${zIndexAfter}`);
      
      if (zIndexAfter >= zIndexBefore) {
        console.error('❌ Z-index did not decrease!');
        throw new Error(`Failed to send shape to back: z-index remained ${zIndexAfter}`);
      }
      
      console.log(`✅ Successfully sent "${(shapeBefore as any).name || resolvedId}" to back (${zIndexBefore} → ${zIndexAfter})`);
      
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
  
  // STEP 2: Validate shape exists
  const shape = context.rectangles.find(r => r.id === resolvedId);
  if (!shape) {
    console.error(`[deleteElement] Shape not found: ${args.id}`);
    throw new Error(`Shape not found: ${args.id}`);
  }
  
  console.log(`🗑️ Deleting shape: "${(shape as any).name || resolvedId}"`);
  
  // STEP 3: Clear current selection
  context.deselectAll();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // STEP 4: Select the shape to delete
  context.selectShape(resolvedId);
  
  // STEP 5: Wait for selection state to update (CRITICAL!)
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // STEP 6: Execute deletion
  await context.deleteSelected();
  
  // STEP 7: Verify deletion succeeded
  await new Promise(resolve => setTimeout(resolve, 100));
  const stillExists = context.rectangles.find(r => r.id === resolvedId);
  if (stillExists) {
    console.error(`[deleteElement] Shape still exists after delete: ${resolvedId}`);
    throw new Error(`Failed to delete shape: ${(shape as any).name || resolvedId}`);
  }
  
  console.log(`✅ Successfully deleted: "${(shape as any).name || resolvedId}"`);
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
  
  // STEP 1: Resolve and validate all IDs
  const resolvedIds: string[] = [];
  const failedIds: string[] = [];
  
  for (const id of ids) {
    try {
      const resolvedId = resolveShapeId(id, context);
      const shape = context.rectangles.find(r => r.id === resolvedId);
      
      if (shape) {
        resolvedIds.push(resolvedId);
        console.log(`  ✅ Found: "${(shape as any).name || resolvedId}"`);
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
  
  // STEP 2: Clear current selection
  console.log('📋 Clearing selection...');
  context.deselectAll();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // STEP 3: Select all shapes to be deleted
  console.log(`📋 Selecting ${resolvedIds.length} shapes...`);
  for (const resolvedId of resolvedIds) {
    context.selectShape(resolvedId);
  }
  
  // STEP 4: Wait for selection state to update (CRITICAL - increased to 200ms)
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // STEP 5: Execute deletion
  console.log('🗑️ Executing delete...');
  await context.deleteSelected();
  
  // STEP 6: Wait and verify
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const remainingShapes = context.rectangles.filter(r => resolvedIds.includes(r.id));
  
  if (remainingShapes.length === 0) {
    console.log(`✅ Successfully deleted ${resolvedIds.length} shapes`);
  } else {
    console.error(`❌ Delete incomplete: ${remainingShapes.length} shapes still exist`);
    throw new Error(`Failed to delete ${remainingShapes.length} shapes`);
  }
}

