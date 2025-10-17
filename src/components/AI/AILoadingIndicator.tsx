/**
 * AI Loading Indicator
 * 
 * Shows loading state and progress for AI operations.
 */

import React from 'react';
import { useAI } from '../../context/AIContext';

export function AILoadingIndicator() {
  const { isProcessing, progress } = useAI();

  if (!isProcessing) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
      {/* Spinner */}
      <div className="animate-spin">
        <svg 
          className="w-5 h-5 text-blue-600" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>

      {/* Message */}
      <div className="flex-1 text-sm text-blue-900">
        {progress ? (
          <div>
            <div className="font-medium">
              Executing {progress.operation?.name || 'operation'}...
            </div>
            <div className="text-xs text-blue-700 mt-1">
              Step {progress.current} of {progress.total}
            </div>
          </div>
        ) : (
          <div className="font-medium">
            AI is thinking...
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

