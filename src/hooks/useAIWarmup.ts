import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';

/**
 * Get the AI Cloud Function URL based on environment
 */
function getAIFunctionUrl(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const useEmulators = process.env.REACT_APP_USE_EMULATORS === 'true';
  
  if (isDevelopment && useEmulators) {
    // Local emulator
    return 'http://localhost:5001/collab-canvas-mlx93-staging/us-central1/aiCommand';
  } else {
    // Production/Staging (or dev without emulators)
    const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'collab-canvas-mlx93-staging';
    return `https://us-central1-${projectId}.cloudfunctions.net/aiCommand`;
  }
}

/**
 * Warm up the AI Cloud Function on app load to avoid cold start delays
 * 
 * This hook sends a lightweight "ping" request to wake up the function
 * so that the user's first real AI command is fast (~100ms instead of 5-10s).
 * 
 * The ping happens 2 seconds after the component mounts to allow the app
 * to finish loading first.
 */
export function useAIWarmup() {
  const [isWarm, setIsWarm] = useState(false);
  const [isWarming, setIsWarming] = useState(false);
  
  useEffect(() => {
    const warmUp = async () => {
      try {
        setIsWarming(true);
        
        // Wait for user to be authenticated
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          console.log('[AI Warmup] Skipped - user not authenticated');
          return;
        }

        console.log('[AI Warmup] Pinging function to wake it up...');
        const startTime = performance.now();

        const response = await fetch(getAIFunctionUrl(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'ping',
            canvasState: {
              shapes: [],
              viewport: { 
                centerX: 2500, 
                centerY: 2500, 
                scale: 1,
                visibleWidth: 1200,
                visibleHeight: 800
              },
              selectedIds: [],
              canvasWidth: 5000,
              canvasHeight: 5000,
            },
            mode: 'plan'
          })
        });
        
        const duration = performance.now() - startTime;
        
        if (response.ok) {
          setIsWarm(true);
          console.log(`[AI Warmup] ✅ Function warm and ready (${Math.round(duration)}ms)`);
        } else {
          console.log(`[AI Warmup] Ping completed with status ${response.status} (${Math.round(duration)}ms)`);
        }
      } catch (error) {
        console.log('[AI Warmup] Ping sent (may have failed, but function should be warming)');
      } finally {
        setIsWarming(false);
      }
    };

    // Warm up after 2 seconds to let app load first
    const timer = setTimeout(warmUp, 2000);
    return () => clearTimeout(timer);
  }, []);

  return { isWarm, isWarming };
}

