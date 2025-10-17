/**
 * AI Command Input
 * 
 * Input component for entering natural language commands to the AI agent.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../../context/AIContext';

interface AICommandInputProps {
  className?: string;
}

export function AICommandInput({ className = '' }: AICommandInputProps) {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { executeCommand, isProcessing } = useAI();

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim() || isProcessing) {
      return;
    }

    // Execute command
    await executeCommand(prompt);

    // Clear input
    setPrompt('');
    inputRef.current?.focus();
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape to clear
    if (e.key === 'Escape') {
      setPrompt('');
      inputRef.current?.blur();
    }
  };

  /**
   * Explicitly handle paste events for compatibility with voice-to-text
   * Voice-to-text systems may not trigger onChange properly, so we handle paste explicitly
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent default to handle manually
    
    // Get pasted text from clipboard
    const pastedText = e.clipboardData.getData('text');
    
    // Get current cursor position
    const input = inputRef.current;
    if (!input) return;
    
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    
    // Insert pasted text at cursor position
    const newValue = prompt.substring(0, start) + pastedText + prompt.substring(end);
    setPrompt(newValue);
    
    // Set cursor position after pasted text
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = start + pastedText.length;
      input.focus();
    }, 0);
  };

  /**
   * Auto-focus on mount
   */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 ${className}`}
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask AI to create or modify shapes..."
          disabled={isProcessing}
          autoComplete="off"
          spellCheck="true"
          className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        />
        
        {/* Magic wand icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
            />
          </svg>
        </div>
      </div>

      <button
        type="submit"
        disabled={!prompt.trim() || isProcessing}
        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? 'Processing...' : 'Send'}
      </button>
    </form>
  );
}

