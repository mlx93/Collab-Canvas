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
    pattern: /^delete all (square|rectangle|circle|triangle|line|text)s?$/i,
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
  }
];

/**
 * Helper to match color patterns in hex codes
 */
function isColorMatch(hexColor: string, colorName: string): boolean {
  const colorPatterns: Record<string, RegExp> = {
    'red': /#(ef4444|dc2626|b91c1c)/i,
    'blue': /#(3b82f6|2563eb|1d4ed8)/i,
    'green': /#(10b981|059669|047857)/i,
    'yellow': /#(f59e0b|d97706|b45309)/i,
    'orange': /#(f97316|ea580c|c2410c)/i,
    'purple': /#(8b5cf6|7c3aed|6d28d9)/i,
  };
  
  const pattern = colorPatterns[colorName.toLowerCase()];
  return pattern ? pattern.test(hexColor) : false;
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

