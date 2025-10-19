/**
 * Pattern Cache for Common AI Commands
 * 
 * Pre-computed templates for frequently used commands to skip OpenAI entirely.
 * Expected speedup: 12s → 100ms (120x faster) for cached patterns!
 */

import { AIOperation } from './types';

interface PatternTemplate {
  pattern: RegExp;
  description: string;
  generator: (matches: RegExpMatchArray, viewport: any, canvasState?: any) => AIOperation[];
  requiresCanvasState?: boolean; // Some patterns need canvas state to work
}

/**
 * Helper to capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Common pattern templates
 */
const PATTERN_TEMPLATES: PatternTemplate[] = [
  // WARM-UP PATTERN (Special case for cold start prevention)
  {
    pattern: /^ping$/i,
    description: "Warm-up ping (returns immediately)",
    generator: () => {
      console.log('  [Warmup] Ping received - function is now warm');
      return []; // Return empty operations
    }
  },
  
  {
    pattern: /^create (\d+) evenly spaced (square|rectangle|circle|triangle)s?$/i,
    description: "Create N evenly spaced shapes",
    generator: (matches, viewport) => {
      const count = parseInt(matches[1]);
      const shapeType = matches[2].toLowerCase();
      const type = shapeType === 'square' ? 'rectangle' : shapeType;
      const spacing = 150;
      const startX = viewport.centerX - ((count - 1) * spacing / 2);
      
      return Array.from({ length: count }, (_, i) => {
        const operation: AIOperation = {
          name: (type === 'rectangle' ? 'createRectangle' : 
                 type === 'circle' ? 'createCircle' : 
                 type === 'triangle' ? 'createTriangle' : 'createRectangle') as any,
          args: {
            x: startX + (i * spacing),
            y: viewport.centerY,
            color: '#3B82F6',
            name: `${capitalize(type)} ${i + 1}`
          } as any
        };
        
        // Add type-specific dimensions
        if (type === 'rectangle') {
          (operation.args as any).width = 100;
          (operation.args as any).height = 100;
        } else if (type === 'circle') {
          (operation.args as any).radius = 50;
        } else if (type === 'triangle') {
          (operation.args as any).width = 100;
          (operation.args as any).height = 100;
        }
        
        return operation;
      });
    }
  },
  
  {
    pattern: /^create (?:a )?login form$/i,
    description: "Create a login form",
    generator: (matches, viewport) => [
      {
        name: 'createText',
        args: {
          x: viewport.centerX,
          y: viewport.centerY - 150,
          text: 'Login',
          fontSize: 32,
          color: '#1F2937',
          name: 'Login Title'
        }
      },
      {
        name: 'createRectangle',
        args: {
          x: viewport.centerX - 150,
          y: viewport.centerY - 50,
          width: 300,
          height: 40,
          color: '#F3F4F6',
          name: 'Username Input'
        }
      },
      {
        name: 'createText',
        args: {
          x: viewport.centerX - 120,
          y: viewport.centerY - 35,
          text: 'Username',
          fontSize: 14,
          color: '#9CA3AF',
          name: 'Username Label'
        }
      },
      {
        name: 'createRectangle',
        args: {
          x: viewport.centerX - 150,
          y: viewport.centerY + 20,
          width: 300,
          height: 40,
          color: '#F3F4F6',
          name: 'Password Input'
        }
      },
      {
        name: 'createText',
        args: {
          x: viewport.centerX - 120,
          y: viewport.centerY + 35,
          text: 'Password',
          fontSize: 14,
          color: '#9CA3AF',
          name: 'Password Label'
        }
      },
      {
        name: 'createRectangle',
        args: {
          x: viewport.centerX - 75,
          y: viewport.centerY + 90,
          width: 150,
          height: 40,
          color: '#3B82F6',
          name: 'Login Button'
        }
      },
      {
        name: 'createText',
        args: {
          x: viewport.centerX,
          y: viewport.centerY + 110,
          text: 'Login',
          fontSize: 16,
          color: '#FFFFFF',
          name: 'Button Text'
        }
      }
    ]
  },
  
  {
    pattern: /^create (?:a )?(?:nav|navigation)(?: bar)? with (\d+) links?$/i,
    description: "Create navigation bar with N links",
    generator: (matches, viewport) => {
      const count = parseInt(matches[1]);
      const spacing = 120;
      const startX = viewport.centerX - ((count - 1) * spacing / 2);
      const barWidth = (count * spacing) + 40;
      
      return [
        // Background bar
        {
          name: 'createRectangle',
          args: {
            x: viewport.centerX - (barWidth / 2),
            y: viewport.centerY - 75,
            width: barWidth,
            height: 60,
            color: '#1F2937',
            name: 'Nav Background'
          }
        },
        // Links
        ...Array.from({ length: count }, (_, i) => ({
          name: 'createText' as any,
          args: {
            x: startX + (i * spacing),
            y: viewport.centerY - 60,
            text: `Link ${i + 1}`,
            fontSize: 16,
            color: '#FFFFFF',
            name: `Nav Link ${i + 1}`
          }
        }))
      ];
    }
  },
  
  {
    pattern: /^create (?:a )?dashboard with (\d+) cards?$/i,
    description: "Create dashboard with N cards",
    generator: (matches, viewport) => {
      const count = parseInt(matches[1]);
      const cols = Math.ceil(Math.sqrt(count)); // Square-ish grid
      const rows = Math.ceil(count / cols);
      const cardWidth = 200;
      const cardHeight = 150;
      const spacing = 30;
      const totalWidth = (cols * cardWidth) + ((cols - 1) * spacing);
      const totalHeight = (rows * cardHeight) + ((rows - 1) * spacing);
      const startX = viewport.centerX - (totalWidth / 2);
      const startY = viewport.centerY - (totalHeight / 2);
      
      const operations: AIOperation[] = [];
      
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + (col * (cardWidth + spacing));
        const y = startY + (row * (cardHeight + spacing));
        
        // Card background
        operations.push({
          name: 'createRectangle',
          args: {
            x,
            y,
            width: cardWidth,
            height: cardHeight,
            color: '#FFFFFF',
            name: `Card ${i + 1}`
          }
        });
        
        // Card title
        operations.push({
          name: 'createText',
          args: {
            x: x + 10,
            y: y + 20,
            text: `Card ${i + 1}`,
            fontSize: 18,
            color: '#1F2937',
            name: `Card ${i + 1} Title`
          }
        });
      }
      
      return operations;
    }
  },
  
  {
    pattern: /^create (\d+) (red|blue|green|yellow|orange|purple) (square|rectangle|circle|triangle)s?$/i,
    description: "Create N colored shapes",
    generator: (matches, viewport) => {
      const count = parseInt(matches[1]);
      const colorName = matches[2].toLowerCase();
      const shapeType = matches[3].toLowerCase();
      const type = shapeType === 'square' ? 'rectangle' : shapeType;
      
      // Color mapping
      const colors: Record<string, string> = {
        red: '#EF4444',
        blue: '#3B82F6',
        green: '#10B981',
        yellow: '#F59E0B',
        orange: '#F97316',
        purple: '#8B5CF6'
      };
      
      const color = colors[colorName] || '#3B82F6';
      const spacing = 150;
      const startX = viewport.centerX - ((count - 1) * spacing / 2);
      
      return Array.from({ length: count }, (_, i) => {
        const operation: AIOperation = {
          name: (type === 'rectangle' ? 'createRectangle' : 
                 type === 'circle' ? 'createCircle' : 
                 type === 'triangle' ? 'createTriangle' : 'createRectangle') as any,
          args: {
            x: startX + (i * spacing),
            y: viewport.centerY,
            color: color,
            name: `${capitalize(colorName)} ${capitalize(type)} ${i + 1}`
          } as any
        };
        
        // Add type-specific dimensions
        if (type === 'rectangle') {
          (operation.args as any).width = 100;
          (operation.args as any).height = 100;
        } else if (type === 'circle') {
          (operation.args as any).radius = 50;
        } else if (type === 'triangle') {
          (operation.args as any).width = 100;
          (operation.args as any).height = 100;
        }
        
        return operation;
      });
    }
  },
  
  // DELETE PATTERNS (Require canvas state)
  {
    pattern: /^(?:please |can you |could you )?(?:delete|remove) all (?:the )?(square|rectangle|circle|triangle|line|text)s?$/i,
    description: "Delete all shapes of a specific type",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const shapeType = matches[1].toLowerCase();
      const normalizedType = shapeType === 'square' ? 'rectangle' : shapeType;
      
      const shapesToDelete = canvasState.shapes.filter((s: any) => 
        s.type === normalizedType
      );
      
      console.log(`  [Delete Cache] Found ${shapesToDelete.length} ${normalizedType}(s) to delete`);
      
      if (shapesToDelete.length === 0) {
        return []; // No shapes to delete
      }
      
      return [{
        name: 'deleteMultipleElements',
        args: {
          ids: shapesToDelete.map((s: any) => s.id)
        }
      }];
    }
  },
  
  {
    pattern: /^(?:please |can you |could you )?(?:delete|remove) (?:the |all |these |those )?(\w+) (square|rectangle|circle|triangle|line|text)s?$/i,
    description: "Delete all colored shapes (e.g., 'delete the red squares' or 'remove all blue circles')",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const color = matches[1].toLowerCase();
      const shapeType = matches[2].toLowerCase();
      const normalizedType = shapeType === 'square' ? 'rectangle' : shapeType;
      
      // Check if first word is actually a color
      const validColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'black', 'white'];
      if (!validColors.includes(color)) {
        return []; // Not a color, skip this pattern
      }
      
      // Find all matching shapes by color and type
      const shapesToDelete = canvasState.shapes.filter((s: any) => {
        const matchesType = s.type === normalizedType;
        const matchesColor = isColorMatch(s.color, color);
        return matchesType && matchesColor;
      });
      
      console.log(`  [Delete Cache] Found ${shapesToDelete.length} ${color} ${normalizedType}(s) to delete`);
      
      if (shapesToDelete.length === 0) {
        return []; // No shapes to delete
      }
      
      return [{
        name: 'deleteMultipleElements',
        args: {
          ids: shapesToDelete.map((s: any) => s.id)
        }
      }];
    }
  },
  
  {
    pattern: /^(?:please |can you |could you )?(?:delete|remove) (?:the |all )?(\d+) (\w+)? ?(square|rectangle|circle|triangle|line|text)s?$/i,
    description: "Delete N shapes (e.g., 'delete 50 red circles' or 'delete 10 circles')",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const count = parseInt(matches[1], 10);
      const color = matches[2] ? matches[2].toLowerCase() : null;
      const shapeType = matches[3].toLowerCase();
      const normalizedType = shapeType === 'square' ? 'rectangle' : shapeType;
      
      // Find matching shapes
      let matchingShapes = canvasState.shapes.filter((s: any) => {
        const matchesType = s.type === normalizedType;
        if (!color) return matchesType;
        const matchesColor = isColorMatch(s.color, color);
        return matchesType && matchesColor;
      });
      
      // Take first N shapes
      const shapesToDelete = matchingShapes.slice(0, count);
      
      console.log(`  [Delete Cache] Deleting ${shapesToDelete.length} ${color || ''} ${normalizedType}(s)`);
      
      if (shapesToDelete.length === 0) {
        return [];
      }
      
      return [{
        name: 'deleteMultipleElements',
        args: {
          ids: shapesToDelete.map((s: any) => s.id)
        }
      }];
    }
  },
  
  {
    pattern: /^delete (\d+) of the (\d+) (\w+) (square|rectangle|circle|triangle)s?$/i,
    description: "Delete N of M colored shapes",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const count = parseInt(matches[1], 10);
      const color = matches[3].toLowerCase();
      const shapeType = matches[4].toLowerCase();
      const normalizedType = shapeType === 'square' ? 'rectangle' : shapeType;
      
      // Find matching shapes by color and type
      const matchingShapes = canvasState.shapes.filter((s: any) => {
        const matchesType = s.type === normalizedType;
        const matchesColor = isColorMatch(s.color, color);
        return matchesType && matchesColor;
      });
      
      // Take first N shapes
      const shapesToDelete = matchingShapes.slice(0, count);
      
      console.log(`  [Delete Cache] Deleting ${shapesToDelete.length} ${color} ${normalizedType}(s)`);
      
      if (shapesToDelete.length === 0) {
        return [];
      }
      
      return [{
        name: 'deleteMultipleElements',
        args: {
          ids: shapesToDelete.map((s: any) => s.id)
        }
      }];
    }
  },
  
  {
    pattern: /^delete (?:the )?selected (?:shape|shapes?|rectangle|circle|triangle)?$/i,
    description: "Delete selected shapes",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.selectedIds) return [];
      
      const selectedIds = canvasState.selectedIds || [];
      console.log(`  [Delete Cache] Deleting ${selectedIds.length} selected shape(s)`);
      
      if (selectedIds.length === 0) {
        return [];
      }
      
      return [{
        name: 'deleteMultipleElements',
        args: {
          ids: selectedIds
        }
      }];
    }
  },
  
  // GRID PATTERNS
  {
    pattern: /^create (?:a )?(\d+)x(\d+) grid of (square|rectangle|circle|triangle)s?$/i,
    description: "Create NxM grid of shapes",
    generator: (matches, viewport) => {
      const rows = parseInt(matches[1], 10);
      const cols = parseInt(matches[2], 10);
      const shapeType = matches[3].toLowerCase();
      const type = shapeType === 'square' ? 'rectangle' : shapeType;
      
      // Validate grid size (max 100 shapes)
      if (rows * cols > 100) {
        console.warn(`  [Grid Cache] Too large: ${rows}x${cols} = ${rows * cols} shapes (max 100)`);
        return []; // Return empty to fall back to OpenAI
      }
      
      console.log(`  [Grid Cache] Creating ${rows}x${cols} grid of ${type}s`);
      
      // Generate createGrid operation
      return [{
        name: 'createGrid',
        args: {
          rows,
          cols,
          cellWidth: 80,
          cellHeight: 80,
          spacing: 20,
          startX: viewport.centerX - (cols * 100) / 2,
          startY: viewport.centerY - (rows * 100) / 2,
          color: '#3B82F6',
          type: type,
          namePrefix: `Grid ${capitalize(type)}`,
        }
      }];
    }
  },
  
  {
    pattern: /^create (?:a )?grid with (\d+) rows and (\d+) columns$/i,
    description: "Create grid with N rows and M columns",
    generator: (matches, viewport) => {
      const rows = parseInt(matches[1], 10);
      const cols = parseInt(matches[2], 10);
      
      // Validate grid size
      if (rows * cols > 100) {
        console.warn(`  [Grid Cache] Too large: ${rows}x${cols} = ${rows * cols} shapes (max 100)`);
        return [];
      }
      
      console.log(`  [Grid Cache] Creating grid with ${rows} rows and ${cols} columns`);
      
      return [{
        name: 'createGrid',
        args: {
          rows,
          cols,
          cellWidth: 80,
          cellHeight: 80,
          spacing: 20,
          startX: viewport.centerX - (cols * 100) / 2,
          startY: viewport.centerY - (rows * 100) / 2,
          color: '#3B82F6',
          type: 'rectangle',
          namePrefix: 'Grid Cell',
        }
      }];
    }
  },
  
  // RESIZE PATTERNS
  {
    pattern: /^(?:increase|grow) (?:the )?size (?:by )?(\d+)%$/i,
    description: "Increase size by N%",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const selectedIds = canvasState.selectedIds || [];
      if (selectedIds.length === 0) return []; // Need selection
      
      const percentage = parseInt(matches[1], 10);
      const multiplier = 1 + (percentage / 100);
      
      console.log(`  [Resize Cache] Increasing size by ${percentage}% for ${selectedIds.length} shape(s)`);
      
      const operations: AIOperation[] = [];
      
      for (const id of selectedIds) {
        const shape = canvasState.shapes.find((s: any) => s.id === id);
        if (!shape) continue;
        
        const updates: any = { id };
        
        // Apply multiplier based on shape type
        if (shape.width !== undefined) updates.width = Math.round(shape.width * multiplier);
        if (shape.height !== undefined) updates.height = Math.round(shape.height * multiplier);
        if (shape.radius !== undefined) updates.radius = Math.round(shape.radius * multiplier);
        
        operations.push({
          name: 'resizeElement',
          args: updates
        });
      }
      
      return operations;
    }
  },
  
  {
    pattern: /^(?:decrease|shrink) (?:the )?size (?:by )?(\d+)%$/i,
    description: "Decrease size by N%",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const selectedIds = canvasState.selectedIds || [];
      if (selectedIds.length === 0) return [];
      
      const percentage = parseInt(matches[1], 10);
      const multiplier = 1 - (percentage / 100);
      
      // Validate multiplier
      if (multiplier <= 0) {
        console.warn(`  [Resize Cache] Invalid decrease: ${percentage}% would result in negative size`);
        return [];
      }
      
      console.log(`  [Resize Cache] Decreasing size by ${percentage}% for ${selectedIds.length} shape(s)`);
      
      const operations: AIOperation[] = [];
      
      for (const id of selectedIds) {
        const shape = canvasState.shapes.find((s: any) => s.id === id);
        if (!shape) continue;
        
        const updates: any = { id };
        
        // Apply multiplier with minimum sizes
        if (shape.width !== undefined) updates.width = Math.max(10, Math.round(shape.width * multiplier));
        if (shape.height !== undefined) updates.height = Math.max(10, Math.round(shape.height * multiplier));
        if (shape.radius !== undefined) updates.radius = Math.max(5, Math.round(shape.radius * multiplier));
        
        operations.push({
          name: 'resizeElement',
          args: updates
        });
      }
      
      return operations;
    }
  },
  
  {
    pattern: /^make (?:it |them )?(\d+)x larger$|^make (?:it |them )?(\d+) times larger$/i,
    description: "Make Nx larger",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const selectedIds = canvasState.selectedIds || [];
      if (selectedIds.length === 0) return [];
      
      const multiplier = parseInt(matches[1] || matches[2], 10);
      
      console.log(`  [Resize Cache] Making ${multiplier}x larger for ${selectedIds.length} shape(s)`);
      
      const operations: AIOperation[] = [];
      
      for (const id of selectedIds) {
        const shape = canvasState.shapes.find((s: any) => s.id === id);
        if (!shape) continue;
        
        const updates: any = { id };
        
        if (shape.width !== undefined) updates.width = Math.round(shape.width * multiplier);
        if (shape.height !== undefined) updates.height = Math.round(shape.height * multiplier);
        if (shape.radius !== undefined) updates.radius = Math.round(shape.radius * multiplier);
        
        operations.push({
          name: 'resizeElement',
          args: updates
        });
      }
      
      return operations;
    }
  },
  
  {
    pattern: /^make (?:it |them )?half (?:the )?size$|^halve (?:the )?size$/i,
    description: "Make half the size",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const selectedIds = canvasState.selectedIds || [];
      if (selectedIds.length === 0) return [];
      
      const multiplier = 0.5;
      
      console.log(`  [Resize Cache] Halving size for ${selectedIds.length} shape(s)`);
      
      const operations: AIOperation[] = [];
      
      for (const id of selectedIds) {
        const shape = canvasState.shapes.find((s: any) => s.id === id);
        if (!shape) continue;
        
        const updates: any = { id };
        
        if (shape.width !== undefined) updates.width = Math.max(10, Math.round(shape.width * multiplier));
        if (shape.height !== undefined) updates.height = Math.max(10, Math.round(shape.height * multiplier));
        if (shape.radius !== undefined) updates.radius = Math.max(5, Math.round(shape.radius * multiplier));
        
        operations.push({
          name: 'resizeElement',
          args: updates
        });
      }
      
      return operations;
    }
  },
  
  // COLOR CHANGE PATTERNS
  {
    pattern: /^(?:change|make|turn|set) (?:the )?(.*?)(?: color)? (?:to|into) (red|blue|green|yellow|orange|purple|pink|white|black|gray|grey)$/i,
    description: "Change color of identified shape (e.g., 'change the red circle to blue')",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const identifier = matches[1].trim();
      const newColorName = matches[2].toLowerCase();
      
      // Color mapping
      const colors: Record<string, string> = {
        red: '#EF4444',
        blue: '#3B82F6',
        green: '#10B981',
        yellow: '#F59E0B',
        orange: '#F97316',
        purple: '#8B5CF6',
        pink: '#EC4899',
        white: '#FFFFFF',
        black: '#000000',
        gray: '#6B7280',
        grey: '#6B7280',
      };
      
      const newColor = colors[newColorName] || '#3B82F6';
      
      // Check if identifier contains quantity words that indicate multiple shapes
      const quantityWords = /\b(other|another|some|few|several|\d+)\b/i;
      if (quantityWords.test(identifier)) {
        console.log(`  [Color Change Cache] Identifier contains quantity/selection words: "${identifier}" - falling back to OpenAI`);
        return []; // Return empty to signal no match
      }
      
      // Find shape by identifier
      const shape = findShapeByIdentifier(identifier, canvasState);
      if (!shape) {
        console.log(`  [Color Change Cache] Could not find shape: "${identifier}" - falling back to OpenAI`);
        return [];
      }
      
      console.log(`  [Color Change Cache] Changing "${identifier}" to ${newColorName}`);
      
      return [{
        name: 'updateStyle',
        args: {
          id: shape.id,
          color: newColor,
        }
      }];
    }
  },
  
  {
    pattern: /^(?:change|make|turn|set) selected (?:shape|shapes?|rectangle|circle|triangle)?(?: color)? (?:to|into) (red|blue|green|yellow|orange|purple|pink|white|black|gray|grey)$/i,
    description: "Change color of selected shapes",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const newColorName = matches[1].toLowerCase();
      
      // Color mapping
      const colors: Record<string, string> = {
        red: '#EF4444',
        blue: '#3B82F6',
        green: '#10B981',
        yellow: '#F59E0B',
        orange: '#F97316',
        purple: '#8B5CF6',
        pink: '#EC4899',
        white: '#FFFFFF',
        black: '#000000',
        gray: '#6B7280',
        grey: '#6B7280',
      };
      
      const newColor = colors[newColorName] || '#3B82F6';
      
      const selectedIds = canvasState.selectedIds || [];
      if (selectedIds.length === 0) {
        console.log(`  [Color Change Cache] No shapes selected`);
        return [];
      }
      
      console.log(`  [Color Change Cache] Changing ${selectedIds.length} selected shape(s) to ${newColorName}`);
      
      const operations: AIOperation[] = [];
      
      for (const id of selectedIds) {
        const shape = canvasState.shapes.find((s: any) => s.id === id);
        if (!shape) continue;
        
        operations.push({
          name: 'updateStyle',
          args: {
            id: shape.id,
            color: newColor,
          }
        });
      }
      
      return operations;
    }
  },
  
  // MOVE PATTERNS
  {
    pattern: /^move (?:the )?(.*?) (left|right|up|down) (?:by )?(\d+)(?: pixels?)?$/i,
    description: "Move identified shape in direction by N pixels",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const identifier = matches[1].trim();
      const direction = matches[2].toLowerCase();
      const distance = parseInt(matches[3], 10);
      
      // Check if identifier contains quantity words that indicate multiple shapes
      // These should fall back to OpenAI for proper handling
      const quantityWords = /\b(other|another|some|few|several|\d+)\b/i;
      if (quantityWords.test(identifier)) {
        console.log(`  [Move Cache] Identifier contains quantity/selection words: "${identifier}" - falling back to OpenAI`);
        return []; // Return empty to signal no match (will fall back to OpenAI)
      }
      
      // Find shape by identifier
      const shape = findShapeByIdentifier(identifier, canvasState);
      if (!shape) {
        console.log(`  [Move Cache] Could not find shape: "${identifier}" - falling back to OpenAI`);
        return []; // Fall back to OpenAI
      }
      
      let deltaX = 0;
      let deltaY = 0;
      
      switch (direction) {
        case 'left': deltaX = -distance; break;
        case 'right': deltaX = distance; break;
        case 'up': deltaY = -distance; break;
        case 'down': deltaY = distance; break;
      }
      
      console.log(`  [Move Cache] Moving "${identifier}" ${direction} by ${distance}px`);
      
      return [{
        name: 'moveElement',
        args: {
          id: shape.id,
          x: shape.x + deltaX,
          y: shape.y + deltaY,
        }
      }];
    }
  },
  
  {
    pattern: /^move selected (?:shapes? )?(left|right|up|down) (?:by )?(\d+)(?: pixels?)?$/i,
    description: "Move selected shapes in direction by N pixels",
    requiresCanvasState: true,
    generator: (matches, viewport, canvasState) => {
      if (!canvasState || !canvasState.shapes) return [];
      
      const direction = matches[1].toLowerCase();
      const distance = parseInt(matches[2], 10);
      
      const selectedIds = canvasState.selectedIds || [];
      if (selectedIds.length === 0) {
        console.log(`  [Move Cache] No shapes selected`);
        return [];
      }
      
      let deltaX = 0;
      let deltaY = 0;
      
      switch (direction) {
        case 'left': deltaX = -distance; break;
        case 'right': deltaX = distance; break;
        case 'up': deltaY = -distance; break;
        case 'down': deltaY = distance; break;
      }
      
      console.log(`  [Move Cache] Moving ${selectedIds.length} selected shape(s) ${direction} by ${distance}`);
      
      const operations: AIOperation[] = [];
      
      for (const id of selectedIds) {
        const shape = canvasState.shapes.find((s: any) => s.id === id);
        if (!shape) continue;
        
        operations.push({
          name: 'moveElement',
          args: {
            id: shape.id,
            x: shape.x + deltaX,
            y: shape.y + deltaY,
          }
        });
      }
      
      return operations;
    }
  }
];

/**
 * Helper to match color patterns using RGB analysis (more flexible than regex)
 */
function isColorMatch(hexColor: string, colorName: string): boolean {
  // Convert hex to RGB
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
  if (!result) return false;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  switch (colorName.toLowerCase()) {
    case 'red':
      // More lenient: catches #FF6B6B, #EF4444, #DC2626, etc.
      return r > 120 && r > g * 1.3 && r > b * 1.3;
    case 'blue':
      return b > 120 && b > r * 1.15 && b > g * 1.15;
    case 'green':
      return g > 120 && g > r * 1.15 && g > b * 1.15;
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
}

/**
 * Helper to find shape by name or color+type
 * Examples: "blue circle", "Header Text", "red square"
 */
function findShapeByIdentifier(identifier: string, canvasState: any): any | null {
  const lowerIdentifier = identifier.toLowerCase();
  
  // Strategy 1: Try exact name match (case-insensitive)
  let shape = canvasState.shapes.find((s: any) => 
    s.name?.toLowerCase() === lowerIdentifier
  );
  if (shape) {
    console.log(`  [Pattern Cache] Found shape by name: "${identifier}"`);
    return shape;
  }
  
  // Strategy 2: Try partial name match
  shape = canvasState.shapes.find((s: any) => 
    s.name?.toLowerCase().includes(lowerIdentifier)
  );
  if (shape) {
    console.log(`  [Pattern Cache] Found shape by partial name: "${identifier}"`);
    return shape;
  }
  
  // Strategy 3: Try color + type match
  const colorWords = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray'];
  const typeWords = ['rectangle', 'circle', 'triangle', 'square', 'line', 'text'];
  
  let matchedColor: string | null = null;
  let matchedType: string | null = null;
  
  for (const color of colorWords) {
    if (lowerIdentifier.includes(color)) {
      matchedColor = color;
      break;
    }
  }
  
  for (const type of typeWords) {
    if (lowerIdentifier.includes(type)) {
      matchedType = type === 'square' ? 'rectangle' : type;
      break;
    }
  }
  
  if (matchedColor && matchedType) {
    const matches = canvasState.shapes.filter((s: any) => 
      s.type === matchedType && isColorMatch(s.color, matchedColor)
    );
    
    if (matches.length === 1) {
      console.log(`  [Pattern Cache] Found unique ${matchedColor} ${matchedType}`);
      return matches[0];
    } else if (matches.length > 1) {
      console.log(`  [Pattern Cache] Found ${matches.length} ${matchedColor} ${matchedType}s (ambiguous)`);
      return null; // Ambiguous, fall back to OpenAI
    }
  }
  
  return null;
}

/**
 * Try to match user prompt to a cached pattern
 * Returns pre-computed operations if match found, null otherwise
 */
export function tryMatchPattern(
  prompt: string,
  viewport: any,
  canvasState?: any
): AIOperation[] | null {
  const trimmedPrompt = prompt.trim();
  
  for (const template of PATTERN_TEMPLATES) {
    // Skip templates that require canvas state if we don't have it
    if (template.requiresCanvasState && !canvasState) {
      continue;
    }
    
    const match = trimmedPrompt.match(template.pattern);
    if (match) {
      console.log(`[Pattern Cache HIT] ${template.description}: "${prompt}"`);
      const operations = template.generator(match, viewport, canvasState);
      console.log(`[Pattern Cache] Generated ${operations.length} operations`);
      return operations;
    }
  }
  
  console.log(`[Pattern Cache MISS] No match for: "${prompt}"`);
  return null;
}

