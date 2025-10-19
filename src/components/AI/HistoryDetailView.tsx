/**
 * History Detail View Component
 * 
 * Displays detailed information about a selected command history entry
 */

import React from 'react';
import { AICommandHistoryEntry } from '../../types/ai-tools';

interface HistoryDetailViewProps {
  entry: AICommandHistoryEntry;
}

export function HistoryDetailView({ entry }: HistoryDetailViewProps) {
  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Command */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Command</h3>
        </div>
        <p className="text-sm text-gray-900 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          {entry.prompt}
        </p>
      </div>

      {/* Status */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Status</h3>
        </div>
        <div className="flex items-center gap-2">
          {entry.success ? (
            <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              ✓ Success
            </span>
          ) : (
            <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
              ✗ Failed
            </span>
          )}
          <span className="text-xs text-gray-500">
            {new Date(entry.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Execution Summary */}
      {entry.executionSummary && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Execution Summary</h3>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Operations:</span>
                <span className="ml-2 font-medium">{entry.executionSummary.operationsExecuted}</span>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2 font-medium">{entry.executionSummary.duration}ms</span>
              </div>
              <div>
                <span className="text-gray-600">Mode:</span>
                <span className="ml-2 font-medium capitalize">{entry.executionSummary.executionMode}</span>
              </div>
              {entry.executionSummary.cacheHit && (
                <div>
                  <span className="text-purple-600 font-medium">⚡ Pattern Cached</span>
                </div>
              )}
            </div>
            
            {/* Shape Changes */}
            <div className="mt-4 space-y-2 text-sm">
              {entry.executionSummary.shapesCreated.length > 0 && (
                <div>
                  <span className="text-green-600 font-medium">Created:</span>
                  <span className="ml-2">{entry.executionSummary.shapesCreated.length} shape(s)</span>
                </div>
              )}
              {entry.executionSummary.shapesModified.length > 0 && (
                <div>
                  <span className="text-blue-600 font-medium">Modified:</span>
                  <span className="ml-2">{entry.executionSummary.shapesModified.length} shape(s)</span>
                </div>
              )}
              {entry.executionSummary.shapesDeleted.length > 0 && (
                <div>
                  <span className="text-red-600 font-medium">Deleted:</span>
                  <span className="ml-2">{entry.executionSummary.shapesDeleted.length} shape(s)</span>
                </div>
              )}
              {entry.executionSummary.executionMode === 'server' && 
               entry.executionSummary.shapesModified.length === 0 && 
               entry.executionSummary.shapesDeleted.length === 0 && (
                <div className="text-xs text-gray-500 italic">
                  Note: Server-side execution only tracks created shapes
                </div>
              )}
            </div>

            {/* Performance Breakdown */}
            {entry.executionSummary.planningTime !== undefined && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Performance Breakdown:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Planning (OpenAI):</span>
                    <span className="font-medium">{entry.executionSummary.planningTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution:</span>
                    <span className="font-medium">{entry.executionSummary.executionTime}ms</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="font-medium">Total:</span>
                    <span className="font-medium">{entry.executionSummary.duration}ms</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operations Executed */}
      {entry.plan && entry.plan.operations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Operations ({entry.plan.operations.length})
            </h3>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {entry.plan.operations.map((op, index) => (
              <div key={index} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{index + 1}. {op.name}</p>
                    <pre className="text-xs text-gray-600 mt-1 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(op.args, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Details */}
      {!entry.success && entry.error && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-bold text-red-900 uppercase tracking-wide">Error Details</h3>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm space-y-3">
            <div>
              <p className="text-sm font-medium text-red-900">Message:</p>
              <p className="text-sm text-red-700 mt-1">{entry.error.message}</p>
            </div>
            
            {entry.error.code && (
              <div>
                <p className="text-sm font-medium text-red-900">Code:</p>
                <p className="text-sm text-red-700 mt-1">{entry.error.code}</p>
              </div>
            )}
            
            {entry.error.operationIndex !== undefined && (
              <div>
                <p className="text-sm font-medium text-red-900">Failed at operation:</p>
                <p className="text-sm text-red-700 mt-1">#{entry.error.operationIndex + 1}</p>
              </div>
            )}
            
            {entry.error.details && (
              <details className="mt-2">
                <summary className="text-sm font-medium text-red-900 cursor-pointer hover:text-red-800">
                  Stack Trace
                </summary>
                <pre className="text-xs text-red-700 mt-2 p-2 bg-red-100 rounded overflow-x-auto max-h-48">
                  {entry.error.details}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* AI Rationale */}
      {entry.plan?.rationale && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">AI Rationale</h3>
          </div>
          <p className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200 shadow-sm leading-relaxed">
            {entry.plan.rationale}
          </p>
        </div>
      )}
    </div>
  );
}

