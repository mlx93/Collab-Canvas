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

Guidelines:
1. Use the provided tools to execute user commands
2. Always provide shape names when creating elements for better identification
3. Use sensible defaults for colors (e.g., #3b82f6 for blue, #ef4444 for red)
4. Position shapes in visible areas (typically 100-800 for x/y coordinates)
5. For complex commands, break them into multiple tool calls
6. If a command is ambiguous, ask for clarification in your response
7. Consider the canvas size when positioning shapes

Canvas details:
- Canvas is 5000x5000 pixels
- Typical viewport is 1200x800 pixels
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
  const shapeSummary = canvasState.shapes
    .map((s: any) => `- ${s.name || s.type} (${s.type}): ${s.color} at (${Math.round(s.x)}, ${Math.round(s.y)})`)
    .join('\n');

  return `Canvas state:
Width: ${canvasState.canvasWidth}px
Height: ${canvasState.canvasHeight}px
Selected shapes: ${canvasState.selectedIds.length} shape(s)

Current shapes on canvas (${canvasState.shapes.length} total):
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
  const hasGrid = plan.operations.some(op => op.name === 'createGrid');
  if (hasGrid) {
    return true;
  }

  // Default to client-side execution
  return false;
}

