/**
 * AI Panel
 * 
 * Main AI interface panel with minimize/expand functionality and history modal.
 */

import React, { useState } from 'react';
import { AICommandInput } from './AICommandInput';
import { AILoadingIndicator } from './AILoadingIndicator';
import { AIHistoryModal } from './AIHistoryModal';
import { useAI } from '../../context/AIContext';

interface AIPanelProps {
  className?: string;
}

export function AIPanel({ className = '' }: AIPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { isProcessing } = useAI();

  return (
    <>
      {/* Main AI Panel */}
      <div className={`flex flex-col ${className}`}>
        {/* Header with Minimize/Expand */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg 
              className="w-5 h-5 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
              />
            </svg>
            <h3 className="text-base font-semibold text-gray-900">
              AI Assistant
            </h3>
            {isProcessing && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span>Thinking...</span>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* History Button */}
            <button
              onClick={() => setShowHistory(true)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="View command history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            {/* Minimize/Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <>
            {/* Description */}
            <p className="text-xs text-gray-600 mb-3">
              Ask the AI to create or modify shapes using natural language.
            </p>

            {/* Examples */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1.5">
                Example commands:
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>• "Create a blue rectangle at 200, 300"</div>
                <div>• "Add a red circle in the center"</div>
                <div>• "Create a login form"</div>
                <div>• "Create a 3x3 grid of squares"</div>
              </div>
            </div>

            {/* Loading Indicator */}
            <AILoadingIndicator />
          </>
        )}

        {/* Command Input (Always Visible) */}
        <AICommandInput />

        {/* Tips (Only when expanded) */}
        {isExpanded && (
          <div className="text-xs text-gray-500 mt-2">
            <strong>Tip:</strong> Be specific with colors, positions, and sizes for best results.
          </div>
        )}
      </div>

      {/* History Modal */}
      <AIHistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </>
  );
}
