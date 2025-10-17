/**
 * AI Command History
 * 
 * Displays recent AI commands and their results.
 */

import React, { useState, useEffect } from 'react';
import { AIPlan } from '../../types/ai-tools';

interface CommandHistoryItem {
  id: string;
  prompt: string;
  plan: AIPlan;
  timestamp: number;
  success: boolean;
}

interface AICommandHistoryProps {
  className?: string;
  maxItems?: number;
}

export function AICommandHistory({ className = '', maxItems = 5 }: AICommandHistoryProps) {
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Load history from localStorage
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-command-history');
      if (saved) {
        const items = JSON.parse(saved);
        setHistory(items.slice(0, maxItems));
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  }, [maxItems]);

  if (history.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg 
            className="w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Recent Commands ({history.length})
          </span>
        </div>
        
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </button>

      {/* History Items */}
      {isExpanded && (
        <div className="border-t border-gray-200 divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {history.map((item) => (
            <div key={item.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {item.prompt}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()} • 
                    {' '}{item.plan.operations.length} operation(s)
                  </div>
                  {item.plan.rationale && (
                    <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {item.plan.rationale}
                    </div>
                  )}
                </div>
                
                {/* Status indicator */}
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${
                  item.success ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to add command to history
 */
export function addCommandToHistory(
  prompt: string,
  plan: AIPlan,
  success: boolean
): void {
  try {
    const historyItem: CommandHistoryItem = {
      id: Date.now().toString(),
      prompt,
      plan,
      timestamp: Date.now(),
      success,
    };

    const saved = localStorage.getItem('ai-command-history');
    const history: CommandHistoryItem[] = saved ? JSON.parse(saved) : [];
    
    // Add new item to beginning
    history.unshift(historyItem);
    
    // Keep only last 10 items
    const trimmed = history.slice(0, 10);
    
    localStorage.setItem('ai-command-history', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save command history:', error);
  }
}

