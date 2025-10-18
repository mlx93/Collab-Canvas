/**
 * AI History Modal
 * 
 * Modal displaying the history of AI commands and their results.
 */

import React, { useEffect } from 'react';
import { useAI } from '../../context/AIContext';

interface AIHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIHistoryModal({ isOpen, onClose }: AIHistoryModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Bottom Left Position */}
      <div className="fixed bottom-24 left-20 z-50 w-96 max-h-[70vh] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-gray-900">Command History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* History Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AIHistoryContent />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Your command history is stored locally in this session</span>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * History Content Component
 * Displays the list of commands
 */
function AIHistoryContent() {
  // For now, we'll use a simple localStorage-based history
  // Later this can be enhanced to use AIContext state
  const [history, setHistory] = React.useState<Array<{
    prompt: string;
    timestamp: number;
    success: boolean;
    result?: string;
  }>>([]);

  useEffect(() => {
    // Load history from localStorage
    const saved = localStorage.getItem('ai_command_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
  }, []);

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No commands yet</p>
        <p className="text-xs mt-1">Your AI command history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.slice().reverse().map((item, idx) => (
        <div 
          key={history.length - idx - 1}
          className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
        >
          {/* Timestamp */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              {new Date(item.timestamp).toLocaleString()}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              item.success 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {item.success ? 'Success' : 'Failed'}
            </span>
          </div>
          
          {/* Command */}
          <div className="text-sm text-gray-900 font-medium mb-1">
            {item.prompt}
          </div>
          
          {/* Result */}
          {item.result && (
            <div className="text-xs text-gray-600">
              {item.result}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

