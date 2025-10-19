/**
 * AI Chat Message
 * 
 * Individual message component for user, AI, and system messages.
 */

import React from 'react';
import { AIOperationCard } from './AIOperationCard';
import { ChatMessage } from '../../context/AIContext';

interface AIChatMessageProps {
  message: ChatMessage;
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  // User message - right aligned, blue bubble
  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // System message - centered, gray pill
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  // AI message - left aligned, gray bubble with operations
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-gray-100 rounded-lg p-3 space-y-2">
        {/* AI's rationale/explanation */}
        {message.rationale && (
          <p className="text-sm text-gray-700">{message.rationale}</p>
        )}

        {/* Operation cards */}
        {message.operationResults && message.operationResults.length > 0 && (
          <div className="space-y-2 mt-2">
            {message.operationResults.map((result, index) => (
              <AIOperationCard
                key={index}
                operation={result.operation}
                status={result.status}
                error={result.error}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

