/**
 * AI Operation Card
 * 
 * Visual card showing individual operation status with color coding and icons.
 */

import React from 'react';
import { AIOperation } from '../../types/ai-tools';

interface AIOperationCardProps {
  operation: AIOperation;
  status: 'pending' | 'executing' | 'success' | 'error';
  error?: string;
}

/**
 * Status Icon Component
 */
function StatusIcon({ status }: { status: AIOperationCardProps['status'] }) {
  if (status === 'pending') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
      </svg>
    );
  }

  if (status === 'executing') {
    return (
      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  }

  if (status === 'success') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  // error
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Get human-readable operation display name
 */
function getOperationDisplayName(operation: AIOperation): string {
  const args = operation.args as any;
  const name = operation.name as string;
  
  switch (name) {
    case 'createRectangle':
      return `Create Rectangle${args.name ? ` "${args.name}"` : ''}`;
    case 'createCircle':
      return `Create Circle${args.name ? ` "${args.name}"` : ''}`;
    case 'createTriangle':
      return `Create Triangle${args.name ? ` "${args.name}"` : ''}`;
    case 'createLine':
      return `Create Line${args.name ? ` "${args.name}"` : ''}`;
    case 'createText':
      return `Create Text "${args.text?.substring(0, 20)}${args.text?.length > 20 ? '...' : ''}"`;
    case 'moveElement':
      return 'Move Shape';
    case 'resizeElement':
      return 'Resize Shape';
    case 'rotateElement':
      return 'Rotate Shape';
    case 'updateStyle':
      return 'Update Style';
    case 'deleteElement':
      return 'Delete Shape';
    case 'deleteMultipleElements':
      return `Delete ${args.ids?.length || 0} Shape${args.ids?.length !== 1 ? 's' : ''}`;
    case 'arrangeElements':
      return `Arrange ${args.direction === 'horizontal' ? 'Horizontal' : 'Vertical'}`;
    case 'createGrid':
      return `Create Grid (${args.rows}×${args.cols})`;
    case 'bringToFront':
      return 'Bring to Front';
    case 'sendToBack':
      return 'Send to Back';
    default:
      // Handle any other operation names gracefully
      return name.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
  }
}

/**
 * AI Operation Card Component
 */
export function AIOperationCard({ operation, status, error }: AIOperationCardProps) {
  const displayName = getOperationDisplayName(operation);
  
  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors
      ${status === 'pending' ? 'bg-gray-200 text-gray-600' : ''}
      ${status === 'executing' ? 'bg-blue-100 text-blue-700 animate-pulse' : ''}
      ${status === 'success' ? 'bg-green-100 text-green-700' : ''}
      ${status === 'error' ? 'bg-red-100 text-red-700' : ''}
    `}>
      {/* Status Icon */}
      <div className="flex-shrink-0">
        <StatusIcon status={status} />
      </div>

      {/* Operation Name and Error */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{displayName}</div>
        {error && (
          <div className="text-xs text-red-600 mt-1 break-words">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

