// FPS monitoring hook using requestAnimationFrame
import { useState, useEffect, useRef } from 'react';

interface UseFPSOptions {
  sampleSize?: number; // Number of frames to average
}

export const useFPS = (options: UseFPSOptions = {}): number => {
  const { sampleSize = 60 } = options;
  const [fps, setFPS] = useState<number>(60);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const calculateFPS = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Calculate frame time in ms
      const frameTime = delta;
      
      // Add to array
      frameTimesRef.current.push(frameTime);
      
      // Keep only last N frames
      if (frameTimesRef.current.length > sampleSize) {
        frameTimesRef.current.shift();
      }

      // Calculate average frame time
      const avgFrameTime =
        frameTimesRef.current.reduce((sum, time) => sum + time, 0) /
        frameTimesRef.current.length;

      // Convert to FPS (1000ms / avg frame time)
      const currentFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : 60;
      
      setFPS(currentFPS);

      // Continue loop
      rafIdRef.current = requestAnimationFrame(calculateFPS);
    };

    // Start the loop
    rafIdRef.current = requestAnimationFrame(calculateFPS);

    // Cleanup
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [sampleSize]);

  return fps;
};
