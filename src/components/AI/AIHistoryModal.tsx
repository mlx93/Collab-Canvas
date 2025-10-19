/**
 * AI History Modal
 * 
 * Enhanced modal displaying comprehensive command history with execution details
 * Phase 3: Two-column layout with search/filter and detailed views
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAI } from '../../context/AIContext';
import { AICommandHistoryEntry } from '../../types/ai-tools';
import { HistoryListItem } from './HistoryListItem';
import { HistoryDetailView } from './HistoryDetailView';

interface AIHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIHistoryModal({ isOpen, onClose }: AIHistoryModalProps) {
  const { commandHistory, rerunCommand, clearHistory, deleteHistoryEntry } = useAI();
  const [selectedEntry, setSelectedEntry] = useState<AICommandHistoryEntry | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and search history
  const filteredHistory = useMemo(() => {
    return commandHistory
      .filter(entry => {
        // Status filter
        if (filterStatus === 'success' && !entry.success) return false;
        if (filterStatus === 'failed' && entry.success) return false;
        
        // Search filter
        if (searchQuery && !entry.prompt.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        return true;
      })
      .reverse(); // Most recent first
  }, [commandHistory, filterStatus, searchQuery]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Command History</h2>
              <p className="text-sm text-gray-600">Track and manage your AI operations</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700"
            >
              <option value="all">All ({commandHistory.length})</option>
              <option value="success">✓ Success ({commandHistory.filter(e => e.success).length})</option>
              <option value="failed">✗ Failed ({commandHistory.filter(e => !e.success).length})</option>
            </select>

            {/* Clear All Button */}
            <button
              onClick={clearHistory}
              className="px-4 py-2.5 border-2 border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              title="Clear all command history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>
        </div>

        {/* Content: Two-column layout */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Left: History List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto bg-gray-50">
            {filteredHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">No commands found</p>
                  <p className="text-sm text-gray-500">
                    {searchQuery || filterStatus !== 'all' 
                      ? 'Try adjusting your filters or search terms' 
                      : 'Execute an AI command to see it appear here'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredHistory.map(entry => (
                  <HistoryListItem
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    onSelect={() => setSelectedEntry(entry)}
                    onRerun={() => {
                      rerunCommand(entry.id);
                      onClose();
                    }}
                    onDelete={() => {
                      deleteHistoryEntry(entry.id);
                      // Clear selection if deleted entry was selected
                      if (selectedEntry?.id === entry.id) {
                        setSelectedEntry(null);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Detailed View */}
          <div className="w-1/2 overflow-y-auto bg-white">
            {selectedEntry ? (
              <HistoryDetailView entry={selectedEntry} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">Select a command</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Click on any command from the list<br />to view detailed execution information
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Choose from the left panel</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
