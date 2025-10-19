/**
 * AI Chat Panel
 * 
 * Main conversational chat interface with streaming operation updates.
 * Inspired by Figma's AI assistant UI.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAI } from '../../context/AIContext';
import { AICommandInput } from './AICommandInput';
import { AIChatMessage } from './AIChatMessage';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { AIHistoryModal } from './AIHistoryModal';
import { AIClarificationModal } from './AIClarificationModal';

interface AIChatPanelProps {
  className?: string;
}

export function AIChatPanel({ className = '' }: AIChatPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { 
    chatMessages, 
    isProcessing, 
    clarification, 
    executeCommand, 
    cancelClarification 
  } = useAI();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-expand when processing starts
  useEffect(() => {
    if (isProcessing) {
      setIsExpanded(true);
    }
  }, [isProcessing]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && isExpanded) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isExpanded]);

  return (
    <>
      <div className={`fixed bottom-4 left-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            {/* AI Icon */}
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
            <span className="text-sm font-semibold text-gray-900">AI Assistant</span>
            
            {/* Thinking Indicator */}
            {isProcessing && <AIThinkingIndicator />}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* History Button */}
            <button
              onClick={() => setShowHistory(true)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="View command history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Minimize/Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
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

        {/* Chat Messages (only when expanded) */}
        {isExpanded && (
          <div className="h-96 overflow-y-auto p-4 space-y-3 bg-white">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <p className="mb-2">👋 Hi! I'm your AI assistant.</p>
                <p className="text-xs">Ask me to create or modify shapes using natural language.</p>
              </div>
            ) : (
              <>
                {chatMessages.map(message => (
                  <AIChatMessage key={message.id} message={message} />
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
        )}

        {/* Command Input (always visible) */}
        <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
          <AICommandInput />
        </div>
      </div>

      {/* History Modal */}
      <AIHistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />

      {/* Clarification Modal */}
      {clarification && (
        <AIClarificationModal
          question={clarification.question}
          options={clarification.options}
          onSelect={(selectedOption) => {
            executeCommand(clarification.originalPrompt, selectedOption);
          }}
          onCancel={cancelClarification}
        />
      )}
    </>
  );
}

