/**
 * AI Clarification Modal
 * 
 * Displays when the AI needs user input to disambiguate a command.
 * Example: "Which circle did you mean?" with clickable options.
 */

import React from 'react';

interface AIClarificationModalProps {
  question: string;
  options: string[];
  onSelect: (selectedOption: string) => void;
  onCancel: () => void;
}

export function AIClarificationModal({
  question,
  options,
  onSelect,
  onCancel,
}: AIClarificationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🤖</span>
            <h3 className="text-lg font-semibold text-gray-900">
              AI Needs Clarification
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Question */}
        <p className="text-gray-700 mb-4">
          {question}
        </p>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => onSelect(option)}
              className="w-full text-left px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-150 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-800 group-hover:text-blue-700 font-medium">
                  {option}
                </span>
                <svg 
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          Cancel Command
        </button>
      </div>
    </div>
  );
}

