/**
 * AI Chat Message
 * 
 * Individual message component for user, AI, and system messages.
 */

import React from 'react';
import { AIOperationCard } from './AIOperationCard';
import { AIClarificationMessage } from './AIClarificationMessage';
import { ChatMessage } from '../../context/AIContext';
import { useAI } from '../../context/AIContext';

interface AIChatMessageProps {
  message: ChatMessage;
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  const { executeCommand, cancelClarification } = useAI();
  
  // Clarification message - inline with clickable options
  if (message.type === 'clarification' && message.clarification) {
    return (
      <AIClarificationMessage
        question={message.clarification.question}
        options={message.clarification.options}
        onSelect={(selectedOption) => {
          executeCommand(message.clarification!.originalPrompt, selectedOption);
        }}
        onCancel={cancelClarification}
      />
    );
  }
  
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

  // System message - centered, formatted text
  if (message.type === 'system') {
    // Check if message contains a list (for clarification options)
    const hasNewlines = message.content.includes('\n');
    
    if (hasNewlines) {
      // Format as a list
      const lines = message.content.split('\n');
      const header = lines[0];
      const items = lines.slice(1).filter(line => line.trim());
      
      return (
        <div className="flex justify-center w-full">
          <div className="max-w-[85%] bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
            <p className="font-medium text-blue-900 mb-2">{header}</p>
            <ul className="space-y-1 text-blue-700">
              {items.map((item, index) => (
                <li key={index} className="pl-0">{item}</li>
              ))}
            </ul>
            <p className="text-blue-600 text-xs mt-2 italic">
              👆 Click an option in the modal above
            </p>
          </div>
        </div>
      );
    }
    
    // Regular system message (success/error)
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

