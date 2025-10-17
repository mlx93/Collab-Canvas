// Keyboard Shortcuts Legend - Persistent menu from left toolbar
import React, { useState } from 'react';

export const ShortcutsLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shortcuts = [
    {
      category: 'Selection',
      items: [
        { key: '⌘A', description: 'Select All' },
        { key: 'Esc', description: 'Deselect All' },
        { key: 'Shift+Click', description: 'Multi-Select' },
        { key: 'Shift+Drag', description: 'Drag-Select Region' },
      ]
    },
    {
      category: 'Copy/Paste',
      items: [
        { key: '⌘C', description: 'Copy Selected' },
        { key: '⌘V', description: 'Paste Shapes' },
        { key: '⌘D', description: 'Create Duplicate' },
        { key: 'Del', description: 'Delete Selected' },
      ]
    },
    {
      category: 'Movement',
      items: [
        { key: 'Drag', description: 'Move Shape(s)' },
        { key: 'Shift+Drag', description: 'Move Multiple' },
      ]
    },
    {
      category: 'View',
      items: [
        { key: 'Shift +', description: 'Zoom In' },
        { key: 'Shift -', description: 'Zoom Out' },
        { key: 'Drag Empty', description: 'Pan Canvas' },
      ]
    }
  ];

  return (
    <div className="relative">
      {/* Hover Trigger Icon */}
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-lg hover:bg-gray-100 relative group cursor-pointer"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        title="Keyboard Shortcuts"
      >
        ⌨️
      </div>

      {/* Persistent Menu - No gap, stays open on hover */}
      {isExpanded && (
        <div
          className="absolute left-10 top-0 bg-white border border-gray-200 rounded-r-lg shadow-lg z-50 w-64 max-h-96 flex flex-col"
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Fixed Header */}
          <div className="p-4 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Keyboard Shortcuts</h3>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            {shortcuts.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-4 last:mb-0">
                <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                  {category.category}
                </h4>
                <div className="space-y-1">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-center hover:bg-gray-50 px-2 py-1 rounded">
                      <span className="text-xs text-gray-700">{item.description}</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Fixed Footer */}
          <div className="p-4 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Hover to keep menu open
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
