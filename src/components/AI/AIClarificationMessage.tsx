/**
 * AI Clarification Message
 * 
 * Inline clarification component that appears in the chat flow.
 * Shows clickable options for user to select from.
 * Hovering over an option previews the selection on the canvas.
 */

import React from 'react';
import { useCanvas } from '../../context/CanvasContext';

interface AIClarificationMessageProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
  onCancel: () => void;
}

/**
 * Extract element ID from option text
 * Format: "Circle 1 (ID: NOkuccaf1dPOkm7tlCcL)" or "Circle 1"
 */
function extractElementId(option: string): string | null {
  const match = option.match(/\(ID:\s*([^)]+)\)/);
  return match ? match[1] : null;
}

export function AIClarificationMessage({
  question,
  options,
  onSelect,
  onCancel,
}: AIClarificationMessageProps) {
  const canvas = useCanvas();
  return (
    <div className="flex justify-start w-full">
      <div className="max-w-[90%] bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-md">
        {/* Question Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🤔</span>
          <h4 className="font-semibold text-blue-900 text-sm">
            {question}
          </h4>
        </div>

        {/* Options List */}
        <div className="space-y-2 mb-3 max-h-64 overflow-y-auto pr-1">
          {options.map((option, index) => {
            const elementId = extractElementId(option);
            
            return (
              <button
                key={index}
                onClick={() => onSelect(option)}
                onMouseEnter={() => {
                  // Preview: Select the element on canvas
                  if (elementId) {
                    canvas.deselectAll();
                    canvas.selectShape(elementId);
                  }
                }}
                onMouseLeave={() => {
                  // Clear preview selection
                  if (elementId) {
                    canvas.deselectShape(elementId);
                  }
                }}
                className="w-full text-left px-3 py-2.5 rounded-md bg-white border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-150 group shadow-sm hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-800 group-hover:text-blue-700 font-medium flex-1">
                    <span className="text-blue-600 font-semibold mr-2">{index + 1}.</span>
                    {option}
                  </span>
                  <svg 
                    className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-2"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Cancel Button */}
        <button
          onClick={() => {
            canvas.deselectAll();
            onCancel();
          }}
          onMouseEnter={() => {
            // Clear any preview selections when hovering over cancel
            canvas.deselectAll();
          }}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
        >
          Cancel Command
        </button>

        {/* Helper Text */}
        <p className="text-xs text-blue-600 mt-2 text-center italic">
          Click an option above to continue
        </p>
      </div>
    </div>
  );
}

