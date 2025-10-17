/**
 * AI Canvas Service
 * 
 * Client-side service for communicating with the AI Cloud Function.
 * Handles request/response and error handling.
 */

import { auth } from './firebase';
import {
  AICommandRequest,
  AICommandResponse,
  AIPlan,
  CanvasSnapshot,
  AIErrorCode,
} from '../types/ai-tools';

/**
 * AI Canvas Service Class
 */
export class AICanvasService {
  private readonly functionUrl: string;

  constructor() {
    // Determine function URL based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // Local emulator
      this.functionUrl = 'http://localhost:5001/collab-canvas-mlx93-staging/us-central1/aiCommand';
    } else {
      // Production/Staging
      const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'collab-canvas-mlx93-staging';
      this.functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/aiCommand`;
    }
  }

  /**
   * Request an AI plan (client will execute operations)
   */
  async requestPlan(
    prompt: string,
    canvasState: CanvasSnapshot
  ): Promise<AIPlan> {
    const request: AICommandRequest = {
      prompt,
      canvasState,
      mode: 'plan',
    };

    const response = await this.sendRequest(request);
    
    if (!response.success || !response.plan) {
      throw new Error(response.error?.message || 'Failed to generate plan');
    }

    return response.plan;
  }

  /**
   * Request server-side execution (for complex operations)
   */
  async requestExecute(
    prompt: string,
    canvasState: CanvasSnapshot
  ): Promise<{
    plan: AIPlan;
    executionSummary: {
      operationsApplied: number;
      shapeIds: string[];
      timestamp: number;
    };
  }> {
    const request: AICommandRequest = {
      prompt,
      canvasState,
      mode: 'execute',
    };

    const response = await this.sendRequest(request);
    
    if (!response.success || !response.plan || !response.executionSummary) {
      throw new Error(response.error?.message || 'Failed to execute command');
    }

    return {
      plan: response.plan,
      executionSummary: response.executionSummary,
    };
  }

  /**
   * Send request to Cloud Function
   */
  private async sendRequest(
    request: AICommandRequest
  ): Promise<AICommandResponse> {
    try {
      // Get Firebase auth token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await currentUser.getIdToken();

      // Make request
      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      // Parse response
      const data: AICommandResponse = await response.json();

      // Handle HTTP errors
      if (!response.ok) {
        throw new AIServiceError(
          data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          data.error?.code || AIErrorCode.API_ERROR
        );
      }

      return data;
    } catch (error) {
      // Re-throw AIServiceError as-is
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Network or other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AIServiceError(
          'Network error. Please check your connection.',
          AIErrorCode.API_ERROR
        );
      }

      // Unknown error
      throw new AIServiceError(
        (error as Error).message || 'Unknown error occurred',
        AIErrorCode.API_ERROR
      );
    }
  }
}

/**
 * Custom error class for AI service errors
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * Singleton instance
 */
export const aiCanvasService = new AICanvasService();

