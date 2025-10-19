/**
 * AI Streaming Response
 * 
 * Placeholder component for streaming text responses.
 * Future: Add typing effect animation.
 */

import React from 'react';

interface AIStreamingResponseProps {
  text: string;
  isStreaming?: boolean;
}

export function AIStreamingResponse({ text, isStreaming }: AIStreamingResponseProps) {
  // For now, just render the text directly
  // Future: Add typing effect animation
  return (
    <p className="text-sm text-gray-700">
      {text}
      {isStreaming && <span className="animate-pulse">|</span>}
    </p>
  );
}

