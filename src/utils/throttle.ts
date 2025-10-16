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
  let isExecuting = false;

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // Always store the most recent args
    pendingArgs = args;

    if (timeSinceLastCall >= delay && !isExecuting) {
      // Enough time has passed, execute immediately
      isExecuting = true;
      lastCall = now;
      
      // Clear any pending timeout since we're executing now
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      try {
        func(...args);
      } finally {
        isExecuting = false;
        pendingArgs = null;
      }
    } else if (timeoutId === null && !isExecuting) {
      // Only schedule if no timeout is already pending and not executing
      const remainingTime = delay - timeSinceLastCall;
      timeoutId = setTimeout(() => {
        if (isExecuting) {
          // If we're executing, reschedule
          timeoutId = setTimeout(arguments.callee, remainingTime);
          return;
        }
        
        isExecuting = true;
        lastCall = Date.now();
        
        try {
          // Use the most recent args, not the args from when timeout was scheduled
          if (pendingArgs !== null) {
            func(...pendingArgs);
            pendingArgs = null;
          }
        } finally {
          isExecuting = false;
          timeoutId = null;
        }
      }, remainingTime);
    }
    // If timeoutId is not null or we're executing, just update args for next execution
  };
}
