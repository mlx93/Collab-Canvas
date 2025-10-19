/**
 * AI Command Handler
 * 
 * Processes natural language commands and converts them to canvas operations
 * using OpenAI's function calling feature (with pattern caching for 100x speedup).
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import { AICommandRequest, AICommandResponse, AIPlan, AIErrorCode } from './types';
import { getToolDefinitions } from './tools';
import { executeOperations } from './executor';
import { tryMatchPattern } from './patternCache';

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

    // PHASE 2: Try pattern cache first (100x speedup for common patterns!)
    console.log(`[AI] Checking pattern cache for prompt: "${prompt}"`);
    const cachedOperations = tryMatchPattern(prompt, canvasState.viewport, canvasState);
    let plan: AIPlan;
    
    // Only use cached operations if we got a non-empty array
    if (cachedOperations && cachedOperations.length > 0) {
      // Cache hit! Skip OpenAI entirely
      console.log(`[AI] Pattern cache HIT - bypassing OpenAI for instant response`);
      console.log(`[AI] Generated ${cachedOperations.length} cached operation(s)`);
      plan = {
        operations: cachedOperations,
        rationale: undefined, // Don't mention caching to users
        cached: true // Internal flag for tracking
      };
    } else {
      // Cache miss - use OpenAI
      console.log(`[AI] Pattern cache MISS - calling OpenAI for prompt: "${prompt}"`);
      
      // Initialize OpenAI
      const openai = getOpenAIClient();
      const config = functions.config();
      const model = config.openai?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

      // Get tool definitions
      const tools = getToolDefinitions();

      // Build system message (OPTIMIZED)
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
      plan = {
        operations: toolCalls.map((call) => ({
          name: call.function.name as any,
          args: JSON.parse(call.function.arguments || '{}'),
        })),
        rationale: firstChoice?.message?.content || undefined,
      };
      
      // Check if AI returned needsClarification as text (when it can't use tools properly)
      const messageContent = firstChoice?.message?.content;
      if (messageContent && messageContent.includes('needsClarification')) {
        try {
          // Try to extract JSON from the message
          const jsonMatch = messageContent.match(/\{[\s\S]*"needsClarification"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.needsClarification) {
              plan.needsClarification = parsed.needsClarification;
              plan.operations = []; // Ensure no operations when asking for clarification
              plan.rationale = undefined; // Clear rationale to avoid showing JSON
            }
          }
        } catch (e) {
          console.error('Failed to parse needsClarification from message:', e);
        }
      }
    }

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
 * Build system message for AI (OPTIMIZED - See ORIGINAL_SYSTEM_MESSAGE_BACKUP.md for full version)
 */
function buildSystemMessage(): string {
  return `You are CollabCanvas AI - help users create and manipulate shapes using natural language.

**Shapes**: rectangle (alias: square/box), circle (alias: oval), triangle, line, text

**Positioning**: ALWAYS use viewport coordinates (what user sees):
- "center" → viewport.centerX, viewport.centerY
- "top/bottom/left/right" → centerX/Y ± visibleWidth/Height / 3
- No position? → default to viewport center
- Multiple shapes? → space 150px apart: startX = centerX - (count * 150 / 2), then startX + (i * 150)

**CRITICAL - Shape IDs**:
- Canvas state shows: ID: uuid-123-abc | Name: "Circle 1"
- ✅ ALWAYS use ID field (UUID) in operations: { "id": "uuid-123-abc", "x": 300 }
- ❌ NEVER use Name field as ID: { "id": "Circle 1", "x": 300 } will FAIL
- Name is ONLY for human identification, not operations

**Selection**:
- "selected shapes" → use selectedIds array from canvas state
- Filter by: type, color, position (x/y < centerX/Y), size
- Quantity ("delete 2 of 4") → filter first, then pick quantity (spatial context or random)

**Operations**:
- Colors: Use hex codes - blue=#3B82F6, red=#EF4444, green=#10B981, yellow=#F59E0B, orange=#F97316, purple=#8B5CF6
- Layering: bringToFront, sendToBack
- Style: updateStyle(id, { color, opacity, visible, locked, name })

**Size Changes - CRITICAL FORMULAS**:
IMPORTANT: "increase" means MULTIPLY to make BIGGER, "decrease" means MULTIPLY to make SMALLER

Percentage increases (MAKE BIGGER):
- "increase by 20%" or "increase size by 20%" → NEW = CURRENT × 1.20 (NOT 0.20!)
- "increase by 50%" or "grow by 50%" → NEW = CURRENT × 1.50
- "increase by 100%" → NEW = CURRENT × 2.00

Percentage decreases (MAKE SMALLER):
- "decrease by 20%" or "reduce by 20%" → NEW = CURRENT × 0.80 (NOT 1.20!)
- "decrease by 50%" or "shrink by 50%" → NEW = CURRENT × 0.50
- "decrease by 75%" → NEW = CURRENT × 0.25

Multipliers (direct multiplication):
- "2x larger" or "twice as large" or "double the size" → NEW = CURRENT × 2.0
- "increase by 2x" or "increase size by 2x" → NEW = CURRENT × 2.0
- "3x larger" or "increase by 3x" → NEW = CURRENT × 3.0
- "decrease by 2x" or "shrink by 2x" → NEW = CURRENT ÷ 2.0 (half size)
- "half the size" → NEW = CURRENT × 0.5

No percentage specified:
- "increase the size" (no amount) → DEFAULT: NEW = CURRENT × 1.5 (50% bigger)
- "make bigger" → DEFAULT: NEW = CURRENT × 1.5
- "make smaller" → DEFAULT: NEW = CURRENT × 0.75 (25% smaller)

Examples:
• Circle radius=50, "increase by 20%": NEW = 50 × 1.20 = 60 ✅
• Rectangle width=100, "increase by 2x": NEW = 100 × 2.0 = 200 ✅
• Circle radius=40, "decrease by 2x": NEW = 40 ÷ 2.0 = 20 ✅
• Rectangle width=100, "decrease by 30%": NEW = 100 × 0.70 = 70 ✅ (NOT 100 × 0.30 = 30 ❌)
• Circle radius=40, "increase the size": NEW = 40 × 1.5 = 60 ✅ (default 50% increase)

**Clarification**: Ask when command is ambiguous or vague:
- Multiple shapes with same name → ask which ones to operate on
- Quantity references like "the other 10", "some of the", "a few" → ask which specific shapes
- Ambiguous color references: "the red circle" when 2+ exist → ask which one
- Partial selections: "5 of the 10 red circles" → ask which 5 specific ones
- DO NOT ask for: "all X" - just operate on all matching shapes
- DO NOT ask for: explicit selections like "the selected shapes" - use selectedIds

**CRITICAL - Clarification Format**:
When asking for clarification, you MUST return a JSON response (not plain text) with this exact structure:
{
  "operations": [],
  "needsClarification": {
    "question": "Which circle would you like to change to blue?",
    "options": ["Circle 1 at (697, 344) - ID: abc123", "Circle 2 at (847, 344) - ID: def456"]
  }
}

Format rules:
- question: Short, clear question (e.g., "Which circle?", "Which shapes?")
- options: Array of strings with format: "[Name] at ([x], [y]) - ID: [uuid]"
- Each option MUST include the shape's ID for identification
- DO NOT return clarification as plain text - always use the JSON structure above

**Best Practices**:
- Assign descriptive names: "Login Button", "Header Text"
- Keep shapes in viewport when possible
- Use minimal operations
- Break complex layouts into clear steps`;
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

