// Keyboard Shortcuts Modal - Accessible from header at all times
import React, { useEffect } from 'react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdCtrl = isMac ? '⌘' : 'Ctrl';

  // Handle ESC key to close modal and prevent body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const shortcuts = [
    {
      category: 'Selection',
      items: [
        { keys: `${cmdCtrl}A`, description: 'Select All' },
        { keys: 'Escape', description: 'Deselect All' },
        { keys: 'Shift+Click', description: 'Multi-Select' },
        { keys: 'Shift+Drag', description: 'Drag-Select Region' },
      ]
    },
    {
      category: 'Copy/Paste',
      items: [
        { keys: `${cmdCtrl}C`, description: 'Copy Selected' },
        { keys: `${cmdCtrl}V`, description: 'Paste Shapes' },
        { keys: `${cmdCtrl}D`, description: 'Create Duplicate' },
        { keys: 'Shift+Del', description: 'Delete Selected' },
      ]
    },
    {
      category: 'View',
      items: [
        { keys: 'Shift +', description: 'Zoom In' },
        { keys: 'Shift -', description: 'Zoom Out' },
        { keys: 'Drag Empty', description: 'Pan Canvas' },
      ]
    },
    {
      category: 'Movement',
      items: [
        { keys: 'Drag', description: 'Move Shape(s)' },
        { keys: 'Shift+Drag', description: 'Move Multiple' },
        { keys: '↑↓←→', description: 'Move Selected (10px)' },
        { keys: 'Shift ↑↓←→', description: 'Move Selected (1px)' },
      ]
    },
    {
      category: 'Undo/Redo',
      items: [
        { keys: `${cmdCtrl}U`, description: 'Undo Last Action' },
        { keys: `${cmdCtrl}R`, description: 'Redo Action' },
      ]
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      {/* Modal - Compact, single view */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
              title="Close (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - No scroll, compact grid */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                  <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                  {section.category}
                </h3>
                <div className="space-y-1.5">
                  {section.items.map((shortcut, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between bg-gray-50 hover:bg-indigo-50 rounded-lg px-3 py-2 transition-colors group"
                    >
                      <span className="text-xs text-gray-700 group-hover:text-indigo-700 transition-colors">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-800 shadow-sm group-hover:border-indigo-300 transition-all whitespace-nowrap ml-2">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

