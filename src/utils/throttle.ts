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

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // Clear any pending timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (timeSinceLastCall >= delay) {
      // Enough time has passed, execute immediately
      lastCall = now;
      func(...args);
    } else {
      // Schedule execution for later (trailing edge)
      const remainingTime = delay - timeSinceLastCall;
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
        timeoutId = null;
      }, remainingTime);
    }
  };
}
