/**
 * Throttle utility for limiting function execution rate
 * Used for high-frequency events like cursor tracking and live position streaming
 * 
 * @param func - Function to throttle
 * @param delay - Minimum delay between executions in milliseconds (default: 16ms for 60 FPS)
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number = 16 // 60 FPS (1000ms / 60 ≈ 16ms)
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingArgs: Parameters<T> | null = null;
  let consecutiveFailures = 0;
  const maxFailures = 3;

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // Always store the most recent args
    pendingArgs = args;

    // Circuit breaker: if too many consecutive failures, skip execution
    if (consecutiveFailures >= maxFailures) {
      console.warn('[throttle] Circuit breaker active, skipping execution');
      return;
    }

    if (timeSinceLastCall >= delay) {
      // Enough time has passed, execute immediately
      lastCall = now;
      
      // Clear any pending timeout since we're executing now
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      try {
        func(...args);
        consecutiveFailures = 0; // Reset failure counter on success
        pendingArgs = null;
      } catch (error) {
        consecutiveFailures++;
        console.warn('[throttle] Execution failed:', error);
      }
    } else if (timeoutId === null) {
      // Only schedule if no timeout is already pending
      const remainingTime = delay - timeSinceLastCall;
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        
        try {
          // Use the most recent args, not the args from when timeout was scheduled
          if (pendingArgs !== null) {
            func(...pendingArgs);
            consecutiveFailures = 0; // Reset failure counter on success
            pendingArgs = null;
          }
        } catch (error) {
          consecutiveFailures++;
          console.warn('[throttle] Timeout execution failed:', error);
        }
        
        timeoutId = null;
      }, remainingTime);
    }
    // If timeoutId is not null, just update args for next execution
  };
}
