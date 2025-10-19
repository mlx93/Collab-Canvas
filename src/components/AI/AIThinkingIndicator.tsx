/**
 * AI Thinking Indicator
 * 
 * Animated thinking indicator shown in chat panel header during processing.
 */

import React from 'react';

export function AIThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-blue-600">
      <div className="flex gap-1">
        <span 
          className="animate-bounce text-xs" 
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        >
          ●
        </span>
        <span 
          className="animate-bounce text-xs" 
          style={{ animationDelay: '150ms', animationDuration: '1s' }}
        >
          ●
        </span>
        <span 
          className="animate-bounce text-xs" 
          style={{ animationDelay: '300ms', animationDuration: '1s' }}
        >
          ●
        </span>
      </div>
      <span className="text-xs font-medium">Thinking...</span>
    </div>
  );
}

