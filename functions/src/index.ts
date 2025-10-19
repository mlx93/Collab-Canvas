/**
 * CollabCanvas AI Agent Cloud Functions
 * 
 * This module implements the AI agent backend using OpenAI's function calling.
 * It provides two modes:
 * - Plan mode: Returns an execution plan for the client to execute
 * - Execute mode: Executes operations server-side for complex multi-step commands
 * 
 * Version: 1.1.0 - Fixed serverTimestamp implementation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// CORS configuration
const corsHandler = cors({
  origin: [
    'https://collab-canvas-mlx93-staging.web.app',
    'https://collab-canvas-mlx93.web.app',
    'http://localhost:3000',
  ],
  credentials: true,
});

// Import the aiCommand handler
import { aiCommandHandler } from './aiCommand';

/**
 * Main Cloud Function endpoint for AI commands
 * 
 * POST /aiCommand
 * Body: {
 *   prompt: string,
 *   canvasState: CanvasSnapshot,
 *   mode?: 'plan' | 'execute'
 * }
 */
export const aiCommand = functions
  .region('us-central1')
  .runWith({
    memory: '512MB',  // Increased for better performance
    timeoutSeconds: 60,
  })
  .https
  .onRequest((req, res) => {
    corsHandler(req, res, async () => {
      await aiCommandHandler(req, res);
    });
  });

/**
 * Keep-warm function to prevent cold starts
 * Runs every 5 minutes to keep the function instance warm
 */
export const keepWarm = functions
  .region('us-central1')
  .pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Keep-warm ping - preventing cold starts');
    return null;
  });

