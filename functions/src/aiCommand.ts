/**
 * AI Command Handler
 * 
 * Processes natural language commands and converts them to canvas operations
 * using OpenAI's function calling feature.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import { AICommandRequest, AICommandResponse, AIPlan, AIErrorCode } from './types';
import { getToolDefinitions } from './tools';
import { executeOperations } from './executor';

/**
 * Get OpenAI client with proper configuration
 */
const getOpenAIClient = () => {
  const config = functions.config();
  const apiKey = config.openai?.key || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  return new OpenAI({ apiKey });
};

/**
 * Main AI command handler
 */
export async function aiCommandHandler(
  req: functions.https.Request,
  res: functions.Response<AICommandResponse>
): Promise<void> {
  // Validate request method
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed',
        code: AIErrorCode.INVALID_PROMPT,
      },
    });
    return;
  }

  // Validate authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: AIErrorCode.AUTHENTICATION_REQUIRED,
      },
    });
    return;
  }

  try {
    // Verify Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = decodedToken.email;

    if (!userEmail) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User email not found',
          code: AIErrorCode.AUTHENTICATION_REQUIRED,
        },
      });
      return;
    }

    // Parse request
    const requestData: AICommandRequest = req.body;
    const { prompt, canvasState, mode = 'plan' } = requestData;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid prompt',
          code: AIErrorCode.INVALID_PROMPT,
        },
      });
      return;
    }

    // Validate canvas state
    if (!canvasState || !Array.isArray(canvasState.shapes)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid canvas state',
          code: AIErrorCode.INVALID_PROMPT,
        },
      });
      return;
    }

    // Initialize OpenAI
    const openai = getOpenAIClient();
    const config = functions.config();
    const model = config.openai?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // Get tool definitions
    const tools = getToolDefinitions();

    // Build system message
    const systemMessage = buildSystemMessage();

    // Build user message with canvas context
    const userMessage = buildUserMessage(prompt, canvasState);

    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
    });

    // Parse response
    const firstChoice = completion.choices[0];
    const toolCalls = firstChoice?.message?.tool_calls || [];
    
    // Build plan from tool calls
    const plan: AIPlan = {
      operations: toolCalls.map((call) => ({
        name: call.function.name as any,
        args: JSON.parse(call.function.arguments || '{}'),
      })),
      rationale: firstChoice?.message?.content || undefined,
    };

    // Determine execution mode
    const shouldExecuteServerSide = shouldUseServerExecution(plan, mode);

    if (shouldExecuteServerSide) {
      // Server-side execution for complex operations
      const canvasId = 'default-canvas'; // TODO: Get from request
      const executionSummary = await executeOperations(
        plan.operations,
        canvasId,
        userEmail
      );

      res.status(200).json({
        success: true,
        plan,
        executionSummary,
      });
    } else {
      // Return plan for client-side execution
      res.status(200).json({
        success: true,
        plan,
      });
    }
  } catch (error: any) {
    console.error('AI Command Error:', error);
    
    // Handle specific error types
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication token expired',
          code: AIErrorCode.AUTHENTICATION_REQUIRED,
        },
      });
      return;
    }

    if (error.status === 429) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Rate limit exceeded. Please try again later.',
          code: AIErrorCode.RATE_LIMIT,
        },
      });
      return;
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: AIErrorCode.API_ERROR,
      },
    });
  }
}

/**
 * Build system message for AI
 */
function buildSystemMessage(): string {
  return `You are an AI assistant for a collaborative design canvas called CollabCanvas. 
Your role is to help users create, manipulate, and arrange shapes on the canvas using natural language commands.

Key capabilities:
- Create shapes: rectangles, circles, triangles, lines, and text
- Manipulate shapes: move, resize, rotate, change colors and styles
- Arrange shapes: horizontal/vertical alignment, grids, spacing
- Complex layouts: login forms, navigation bars, card layouts

CRITICAL: Viewport-Relative Positioning
- When users say "center", "middle", "top", "bottom", "left", "right", they mean relative to the VISIBLE viewport
- The viewport is what the user currently sees on screen (provided in viewport.centerX, viewport.centerY)
- Total canvas size is 5000x5000px, but viewport is typically 1200-1920px wide and 800-1080px tall
- viewport.centerX and viewport.centerY are the CENTER of the visible area in canvas coordinates
- viewport.visibleWidth and viewport.visibleHeight are the dimensions of the visible area

Positioning guidelines:
- "in the center" or "at the center" → use viewport.centerX, viewport.centerY
- "at the top" → use viewport.centerX, viewport.centerY - viewport.visibleHeight/3
- "at the bottom" → use viewport.centerX, viewport.centerY + viewport.visibleHeight/3
- "on the left" → use viewport.centerX - viewport.visibleWidth/3, viewport.centerY
- "on the right" → use viewport.centerX + viewport.visibleWidth/3, viewport.centerY
- If no position specified → default to viewport center with slight offset

CRITICAL: Shape Identification Rules

**Shape Type Aliases:**
- "square" or "box" = rectangle
- "oval" = circle  
- All other types: rectangle, circle, triangle, line, text

**Selection Context:**
- Canvas state includes selectedIds array showing which shapes are currently selected
- If user says "the selected [shape]" or "selected shapes", ONLY use shapes from selectedIds
- Example: "move the selected circle 100 pixels right" → find circle in selectedIds, move it

**Shape Identification for Operations:**
When you need to manipulate shapes (move, resize, rotate, delete, style):
1. **ALWAYS use the ID field (UUID) in your operation parameters**, NOT the Name field
   - Canvas state shows: Name: "Circle 1" | ID: abc-123-xyz
   - ✅ Correct operation: { "id": "abc-123-xyz", "x": 300 }
   - ❌ Wrong operation: { "id": "Circle 1", "x": 300 }

2. **Use Name field ONLY for identification/clarification**, never in operation parameters
   - Names help you identify which shape: "Circle 1 is the one at (300, 200)"
   - But operation MUST use the ID: "abc-123-xyz"

3. **If user references "the selected circle":**
   - Check selectedIds array for circle types
   - Use that shape's ID field in your operation

4. **If user says "move the circle" and multiple circles exist:**
   - Check for context clues (color, position, "first", "selected", etc.)
   - If still ambiguous, return needsClarification with Name + position for each
   - User picks one, then use that shape's ID field in operation

5. **For "all circles" or "all rectangles":**
   - Filter shapes by type field
   - Collect all their ID fields (UUIDs)
   - Use deleteMultipleElements with array of IDs: ["uuid1", "uuid2", "uuid3"]

6. **NEVER use shape TYPE alone** ("circle", "rectangle") as an ID - this will ALWAYS fail

Clarification Format:
{
  "operations": [],
  "needsClarification": {
    "question": "Which circle? I see:",
    "options": ["Circle 1 at (300, 200)", "Circle 2 at (500, 400)"]
  }
}

Example: If canvas state shows:
  • Name: "Red Login Button" | Type: rectangle | Color: #ef4444
  • Name: "Blue Circle 1" | Type: circle | Color: #3b82f6
  • Name: "Header Text" | Type: text | Color: #1f2937

When user says "move the red button to 500, 300":
✅ Correct: Use "Red Login Button" as the ID
❌ Wrong: Use "rectangle" or "button" as the ID

Other guidelines:
1. Use the provided tools to execute user commands
2. Always provide descriptive shape names when creating elements
3. Use sensible defaults for colors (e.g., #3b82f6 for blue, #ef4444 for red)
4. For complex commands, break them into multiple tool calls
5. Reference shapes by their exact name or ID from the canvas state list

Canvas details:
- Canvas is 5000x5000 pixels (total space)
- Viewport shows a portion of the canvas (user's current view)
- Colors use hex format (#RRGGBB)
- Z-index determines layering (higher = front)

When creating complex layouts:
- Login forms: Create container, labels, inputs, and button with proper spacing
- Navigation bars: Create background container and evenly-spaced menu items
- Card layouts: Create container, title, image placeholder, and description text`;
}

/**
 * Build user message with canvas context
 */
function buildUserMessage(prompt: string, canvasState: any): string {
  const selectedIds = canvasState.selectedIds || [];
  
  // Format shape list with clear identification
  const shapeSummary = canvasState.shapes
    .map((s: any) => {
      const name = s.name || `${s.type} ${s.id.substring(0, 8)}`;
      const position = `(${Math.round(s.x)}, ${Math.round(s.y)})`;
      const isSelected = selectedIds.includes(s.id);
      const selectedTag = isSelected ? ' [SELECTED]' : '';
      
      // CRITICAL: ID field comes first and is the UUID to use in operations
      return `  • ID: ${s.id} | Name: "${name}" | Type: ${s.type} | Color: ${s.color} | Position: ${position}${selectedTag}`;
    })
    .join('\n');

  const viewport = canvasState.viewport || {};
  
  return `Canvas state:
Total canvas size: ${canvasState.canvasWidth}px × ${canvasState.canvasHeight}px
Selected shapes: ${selectedIds.length} shape(s) - marked with [SELECTED]

Viewport (visible area):
- Center: (${Math.round(viewport.centerX || 0)}, ${Math.round(viewport.centerY || 0)})
- Visible dimensions: ${Math.round(viewport.visibleWidth || 1200)}px × ${Math.round(viewport.visibleHeight || 800)}px
- Zoom level: ${viewport.scale || 1}x

Current shapes on canvas (${canvasState.shapes.length} total):
CRITICAL: In your operations, use the ID field (the UUID), NOT the Name field!
${shapeSummary || 'No shapes yet'}

User command: ${prompt}`;
}

/**
 * Determine if operations should be executed server-side
 */
function shouldUseServerExecution(plan: AIPlan, mode: string): boolean {
  // Explicit mode override
  if (mode === 'execute') return true;
  if (mode === 'plan') return false;

  // Auto-detect based on plan complexity
  const config = functions.config();
  const threshold = parseInt(config.ai?.server_exec_threshold || '6', 10);

  // Execute server-side if operation count exceeds threshold
  if (plan.operations.length >= threshold) {
    return true;
  }

  // Execute server-side if plan contains createGrid (typically many operations)
  const hasGrid = plan.operations.some((op: any) => op.name === 'createGrid');
  if (hasGrid) {
    return true;
  }

  // Default to client-side execution
  return false;
}

