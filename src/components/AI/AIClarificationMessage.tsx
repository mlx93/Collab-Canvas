/**
 * AI Clarification Message
 * 
 * Inline clarification component that appears in the chat flow.
 * Shows clickable options with multi-select support.
 * Hovering over an option previews the selection on the canvas.
 */

import React, { useState, useEffect } from 'react';
import { useCanvas } from '../../context/CanvasContext';

interface AIClarificationMessageProps {
  question: string;
  options: string[];
  onSelect: (option: string | string[]) => void;
  onCancel: () => void;
}

/**
 * Extract element ID from option text
 * Supports multiple formats:
 * - "Circle 1 at (697, 344) - ID: abc123"
 * - "Circle 1 (ID: NOkuccaf1dPOkm7tlCcL)"
 * - "Circle 1"
 */
function extractElementId(option: string): string | null {
  // Try format: "- ID: abc123"
  const match1 = option.match(/-\s*ID:\s*([^\s]+)/);
  if (match1) return match1[1];
  
  // Try format: "(ID: abc123)"
  const match2 = option.match(/\(ID:\s*([^)]+)\)/);
  return match2 ? match2[1] : null;
}

/**
 * Remove ID from display text
 * Strips out "- ID: abc123" or "(ID: abc123)" portions
 */
function stripIdFromDisplay(option: string): string {
  return option
    .replace(/\s*-\s*ID:\s*[^\s]+\s*$/i, '')  // Remove "- ID: abc123" at end
    .replace(/\s*\(ID:\s*[^)]+\)\s*/gi, '')   // Remove "(ID: abc123)"
    .trim();
}

export function AIClarificationMessage({
  question,
  options,
  onSelect,
  onCancel,
}: AIClarificationMessageProps) {
  const canvas = useCanvas();
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  // Preview selected + hovered elements on canvas
  useEffect(() => {
    canvas.deselectAll();
    
    // Select all checked options
    const selectedIds = Array.from(selectedOptions)
      .map(extractElementId)
      .filter((id): id is string => id !== null);
    
    selectedIds.forEach(id => canvas.selectShape(id));
    
    // Also select hovered option if not already selected
    if (hoveredOption && !selectedOptions.has(hoveredOption)) {
      const hoveredId = extractElementId(hoveredOption);
      if (hoveredId) {
        canvas.selectShape(hoveredId);
      }
    }
  }, [selectedOptions, hoveredOption, canvas]);

  const toggleOption = (option: string) => {
    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOptions.size === options.length) {
      setSelectedOptions(new Set());
    } else {
      setSelectedOptions(new Set(options));
    }
  };

  const handleExecute = () => {
    if (selectedOptions.size === 1) {
      // Single selection - pass as string (backward compatible)
      onSelect(Array.from(selectedOptions)[0]);
    } else if (selectedOptions.size > 1) {
      // Multi-selection - pass as array
      onSelect(Array.from(selectedOptions));
    }
  };

  const handleCancel = () => {
    canvas.deselectAll();
    onCancel();
  };

  const allSelected = selectedOptions.size === options.length;
  const hasSelection = selectedOptions.size > 0;
  
  // Parse and format the question text
  // Remove markdown formatting: "1. **Text**" -> "Text"
  const formatQuestion = (text: string) => {
    // Remove numbered list markers and bold markdown
    return text
      .replace(/^\d+\.\s+\*\*(.*?)\*\*/gm, '$1')  // "1. **Text**" -> "Text"
      .replace(/\*\*(.*?)\*\*/g, '$1')             // "**Text**" -> "Text"
      .replace(/^\d+\.\s+/gm, '')                  // "1. Text" -> "Text"
      .replace(/^-\s+/gm, '')                      // "- Text" -> "Text"
      .trim();
  };
  
  const formattedQuestion = formatQuestion(question);
  
  return (
    <div className="flex justify-start w-full">
      <div className="max-w-[90%] bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-md">
        {/* Question Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🤔</span>
          <h4 className="font-semibold text-blue-900 text-sm">
            {formattedQuestion}
          </h4>
        </div>

        {/* Select All Toggle */}
        <button
          onClick={toggleSelectAll}
          className="w-full mb-2 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors flex items-center gap-2"
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            allSelected 
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white border-blue-400'
          }`}>
            {allSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          <span className="ml-auto text-blue-600">({selectedOptions.size}/{options.length} selected)</span>
        </button>

        {/* Options List */}
        <div className="space-y-2 mb-3 max-h-64 overflow-y-auto pr-1">
          {options.map((option, index) => {
            const isSelected = selectedOptions.has(option);
            
            return (
              <button
                key={index}
                onClick={() => toggleOption(option)}
                onMouseEnter={() => setHoveredOption(option)}
                onMouseLeave={() => setHoveredOption(null)}
                className={`w-full text-left px-3 py-2.5 rounded-md border-2 transition-all duration-150 group shadow-sm hover:shadow ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-white border-gray-300 group-hover:border-blue-500'
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Option Text */}
                  <span className={`text-sm font-medium flex-1 ${
                    isSelected ? 'text-blue-900' : 'text-gray-800 group-hover:text-blue-700'
                  }`}>
                    <span className="text-blue-600 font-semibold mr-2">{index + 1}.</span>
                    {stripIdFromDisplay(option)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExecute}
            disabled={!hasSelection}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-md transition-all ${
              hasSelection
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {hasSelection ? (
              <>
                Execute {selectedOptions.size > 1 ? `(${selectedOptions.size})` : ''}
              </>
            ) : (
              'Select to Execute'
            )}
          </button>
          
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-blue-600 mt-2 text-center italic">
          {hasSelection 
            ? `${selectedOptions.size} item${selectedOptions.size > 1 ? 's' : ''} selected • Hover to preview on canvas`
            : 'Select one or more options to continue'}
        </p>
      </div>
    </div>
  );
}

