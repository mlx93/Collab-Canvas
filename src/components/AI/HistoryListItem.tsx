/**
 * History List Item Component
 * 
 * Displays a single command history entry in the list
 */

import React from 'react';
import { AICommandHistoryEntry } from '../../types/ai-tools';

interface HistoryListItemProps {
  entry: AICommandHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  onRerun: () => void;
  onDelete: () => void;
}

export function HistoryListItem({ entry, isSelected, onSelect, onRerun, onDelete }: HistoryListItemProps) {
  return (
    <div
      className={`
        p-4 rounded-lg border-2 cursor-pointer transition-all shadow-sm hover:shadow-md
        ${entry.success 
          ? 'border-green-200 hover:border-green-300' 
          : 'border-red-200 hover:border-red-300'}
        ${isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' 
          : 'bg-white hover:bg-gray-50'}
      `}
      onClick={onSelect}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{entry.prompt}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(entry.timestamp).toLocaleString()}
          </p>
        </div>
        
        {/* Status Badge */}
        {entry.success ? (
          <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            ✓ Success
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
            ✗ Failed
          </span>
        )}
      </div>

      {/* Execution Summary (if available) */}
      {entry.executionSummary && (
        <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
          {/* Shapes Created */}
          {entry.executionSummary.shapesCreated.length > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{entry.executionSummary.shapesCreated.length}</span>
            </div>
          )}
          
          {/* Shapes Modified */}
          {entry.executionSummary.shapesModified.length > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>{entry.executionSummary.shapesModified.length}</span>
            </div>
          )}
          
          {/* Shapes Deleted */}
          {entry.executionSummary.shapesDeleted.length > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{entry.executionSummary.shapesDeleted.length}</span>
            </div>
          )}
          
          {/* Duration */}
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{entry.executionSummary.duration}ms</span>
          </div>
          
          {/* Cache Hit Badge */}
          {entry.executionSummary.cacheHit && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              ⚡ Cached
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRerun();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Rerun
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
          title="Delete this command"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>

      {/* Error Preview (if failed) */}
      {!entry.success && entry.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          {entry.error.message}
        </div>
      )}
    </div>
  );
}

