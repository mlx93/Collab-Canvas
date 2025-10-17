/**
 * OpenAI Tool Definitions
 * 
 * These define the function schemas that OpenAI can call to manipulate the canvas.
 */

import { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Get all tool definitions for OpenAI function calling
 */
export function getToolDefinitions(): ChatCompletionTool[] {
  return [
    // Creation tools
    {
      type: 'function',
      function: {
        name: 'createRectangle',
        description: 'Create a new rectangle on the canvas',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X position of rectangle' },
            y: { type: 'number', description: 'Y position of rectangle' },
            width: { type: 'number', description: 'Width of rectangle' },
            height: { type: 'number', description: 'Height of rectangle' },
            color: { type: 'string', description: 'Hex color code (e.g., #3b82f6)' },
            name: { type: 'string', description: 'Optional name for the rectangle' },
            opacity: { type: 'number', description: 'Opacity (0-1), default 1' },
          },
          required: ['x', 'y', 'width', 'height', 'color'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'createCircle',
        description: 'Create a new circle on the canvas',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X position of circle center' },
            y: { type: 'number', description: 'Y position of circle center' },
            radius: { type: 'number', description: 'Radius of circle' },
            color: { type: 'string', description: 'Hex color code (e.g., #ef4444)' },
            name: { type: 'string', description: 'Optional name for the circle' },
            opacity: { type: 'number', description: 'Opacity (0-1), default 1' },
          },
          required: ['x', 'y', 'radius', 'color'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'createTriangle',
        description: 'Create a new triangle on the canvas',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X position of triangle' },
            y: { type: 'number', description: 'Y position of triangle' },
            width: { type: 'number', description: 'Width of triangle' },
            height: { type: 'number', description: 'Height of triangle' },
            color: { type: 'string', description: 'Hex color code' },
            name: { type: 'string', description: 'Optional name for the triangle' },
            opacity: { type: 'number', description: 'Opacity (0-1), default 1' },
          },
          required: ['x', 'y', 'width', 'height', 'color'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'createLine',
        description: 'Create a new line on the canvas',
        parameters: {
          type: 'object',
          properties: {
            x1: { type: 'number', description: 'X position of line start' },
            y1: { type: 'number', description: 'Y position of line start' },
            x2: { type: 'number', description: 'X position of line end' },
            y2: { type: 'number', description: 'Y position of line end' },
            color: { type: 'string', description: 'Hex color code' },
            name: { type: 'string', description: 'Optional name for the line' },
            opacity: { type: 'number', description: 'Opacity (0-1), default 1' },
          },
          required: ['x1', 'y1', 'x2', 'y2', 'color'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'createText',
        description: 'Create a new text element on the canvas',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text content' },
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            fontSize: { type: 'number', description: 'Font size in pixels' },
            color: { type: 'string', description: 'Hex color code' },
            name: { type: 'string', description: 'Optional name for the text' },
            opacity: { type: 'number', description: 'Opacity (0-1), default 1' },
          },
          required: ['text', 'x', 'y', 'fontSize', 'color'],
        },
      },
    },

    // Manipulation tools
    {
      type: 'function',
      function: {
        name: 'moveElement',
        description: 'Move an element to a new position. Use the exact Name or ID from the canvas state list.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Name or ID of the element from canvas state (e.g., "Blue Circle 1" or the UUID)' },
            x: { type: 'number', description: 'New X position' },
            y: { type: 'number', description: 'New Y position' },
          },
          required: ['id', 'x', 'y'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resizeElement',
        description: 'Resize an element. Use the exact Name or ID from the canvas state list.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Name or ID of the element from canvas state' },
            width: { type: 'number', description: 'New width (for rectangles/triangles)' },
            height: { type: 'number', description: 'New height (for rectangles/triangles)' },
            radius: { type: 'number', description: 'New radius (for circles)' },
            x2: { type: 'number', description: 'New x2 (for lines)' },
            y2: { type: 'number', description: 'New y2 (for lines)' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'rotateElement',
        description: 'Rotate an element. Use the exact Name or ID from the canvas state list.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Name or ID of the element from canvas state' },
            rotation: { type: 'number', description: 'Rotation angle in degrees (0-360)' },
          },
          required: ['id', 'rotation'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'updateStyle',
        description: 'Update the style properties of an element. Use the exact Name or ID from the canvas state list.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Name or ID of the element from canvas state' },
            color: { type: 'string', description: 'New hex color code' },
            opacity: { type: 'number', description: 'New opacity (0-1)' },
            visible: { type: 'boolean', description: 'Visibility state' },
            locked: { type: 'boolean', description: 'Locked state (prevents editing)' },
            name: { type: 'string', description: 'New name for the element' },
          },
          required: ['id'],
        },
      },
    },

    // Layout tools
    {
      type: 'function',
      function: {
        name: 'arrangeElements',
        description: 'Arrange multiple elements in a row or column. Use exact Names or IDs from canvas state for each element.',
        parameters: {
          type: 'object',
          properties: {
            ids: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of element Names or IDs from canvas state (e.g., ["Blue Circle 1", "Red Rectangle", "Header Text"])' 
            },
            arrangement: { 
              type: 'string', 
              enum: ['horizontal', 'vertical'],
              description: 'Arrangement direction' 
            },
            spacing: { type: 'number', description: 'Space between elements in pixels, default 20' },
          },
          required: ['ids', 'arrangement'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'createGrid',
        description: 'Create a grid of shapes',
        parameters: {
          type: 'object',
          properties: {
            rows: { type: 'number', description: 'Number of rows' },
            cols: { type: 'number', description: 'Number of columns' },
            cellWidth: { type: 'number', description: 'Width of each cell' },
            cellHeight: { type: 'number', description: 'Height of each cell' },
            spacing: { type: 'number', description: 'Space between cells, default 10' },
            startX: { type: 'number', description: 'Starting X position, default 100' },
            startY: { type: 'number', description: 'Starting Y position, default 100' },
            color: { type: 'string', description: 'Hex color for all shapes, default #3b82f6' },
            type: { 
              type: 'string', 
              enum: ['rectangle', 'circle', 'triangle', 'line'],
              description: 'Type of shapes to create, default rectangle' 
            },
            namePrefix: { type: 'string', description: 'Name prefix for shapes, default "Grid"' },
          },
          required: ['rows', 'cols', 'cellWidth', 'cellHeight'],
        },
      },
    },

    // Layering tools
    {
      type: 'function',
      function: {
        name: 'bringToFront',
        description: 'Bring an element to the front (highest z-index). Use exact Name or ID from canvas state.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Name or ID of the element from canvas state' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'sendToBack',
        description: 'Send an element to the back (lowest z-index). Use exact Name or ID from canvas state.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Name or ID of the element from canvas state' },
          },
          required: ['id'],
        },
      },
    },

    // Delete tools
    {
      type: 'function',
      function: {
        name: 'deleteElement',
        description: 'Delete a single element from the canvas. Use exact Name or ID from canvas state.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Name or ID of the element to delete from canvas state' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'deleteMultipleElements',
        description: 'Delete multiple elements from the canvas at once. Faster than calling deleteElement multiple times. For bulk operations like "delete all circles" or "delete those 5 rectangles".',
        parameters: {
          type: 'object',
          properties: {
            ids: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of Names or IDs of elements to delete from canvas state' 
            },
          },
          required: ['ids'],
        },
      },
    },

    // Canvas state tool
    {
      type: 'function',
      function: {
        name: 'getCanvasState',
        description: 'Get current canvas state (already provided in context)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },
  ];
}

