// Reusable collapsible section component for properties panel
import React, { useState } from 'react';

interface PropertySectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const PropertySection: React.FC<PropertySectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow" style={{ overflow: isExpanded ? 'visible' : 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
            {title}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-white animate-in fade-in slide-in-from-top-2 duration-150">
          {children}
        </div>
      )}
    </div>
  );
};

