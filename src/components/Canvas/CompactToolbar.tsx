// Compact vertical toolbar with icon-based shape creation
import React, { useState, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { CompactColorPicker } from './CompactColorPicker';

export const CompactToolbar: React.FC = () => {
  const { addRectangle, addCircle, addTriangle, addLine, addText, selectedIds, rectangles, updateShape, defaultColor, defaultOpacity, setDefaultColor, viewport } = useCanvas();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const colorPickerRef = useRef<HTMLButtonElement>(null);
  // const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Not currently used

  // Handle color change for selected shapes or default color
  const handleColorChange = (newColor: string, newOpacity: number) => {
    if (selectedIds.length > 0) {
      // Apply color to all selected shapes
      selectedIds.forEach(shapeId => {
        updateShape(shapeId, { 
          color: newColor, 
          opacity: newOpacity 
        });
      });
    } else {
      // Set default color for future shapes
      setDefaultColor(newColor, newOpacity);
    }
  };

  // Handle color picker positioning
  const handleColorPickerToggle = () => {
    if (colorPickerRef.current) {
      const rect = colorPickerRef.current.getBoundingClientRect();
      setColorPickerPosition({
        x: rect.left + rect.width + 10, // Position to the right of the button
        y: rect.top - 200 // Position higher up near the icon
      });
    }
    setShowColorPicker(!showColorPicker);
  };

  // Listen for canvas click to close color picker
  React.useEffect(() => {
    const handleCloseColorPicker = () => {
      setShowColorPicker(false);
    };
    
    window.addEventListener('closeColorPicker', handleCloseColorPicker);
    return () => window.removeEventListener('closeColorPicker', handleCloseColorPicker);
  }, []);

  // Keyboard shortcut for color picker (P key)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input fields (for text editing, AI assistant, etc.)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
      
      if (isInputField) {
        return; // Let input fields handle their own keyboard events
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setShowColorPicker(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.length]);

  // Tool definitions
  const tools = [
    {
      id: 'rectangle',
      label: 'Rectangle (R)',
      action: () => {
        addRectangle();
        setActiveTool('rectangle');
        setTimeout(() => setActiveTool(null), 500);
      },
    },
    {
      id: 'circle',
      label: 'Circle (C)',
      action: () => {
        addCircle();
        setActiveTool('circle');
        setTimeout(() => setActiveTool(null), 500);
      },
    },
    {
      id: 'triangle',
      label: 'Triangle (T)',
      action: () => {
        addTriangle();
        setActiveTool('triangle');
        setTimeout(() => setActiveTool(null), 500);
      },
    },
    {
      id: 'line',
      label: 'Line (L)',
      action: () => {
        addLine();
        setActiveTool('line');
        setTimeout(() => setActiveTool(null), 500);
      },
    },
    {
      id: 'text',
      label: 'Text (T)',
      action: () => {
        addText();
        setActiveTool('text');
        setTimeout(() => setActiveTool(null), 500);
      },
    },
  ];

  return (
    <div className="fixed left-0 top-16 bottom-0 w-12 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-1 z-10">
      {/* Shape Tool Buttons */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={tool.action}
          className={`
            w-10 h-10 rounded flex items-center justify-center
            hover:bg-gray-100 transition-colors relative group
            ${activeTool === tool.id ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
          `}
          title={tool.label}
        >
          {/* Shape icons - styled with default color */}
          {tool.id === 'rectangle' && (
            <div 
              className="w-6 h-6 rounded-sm transition-colors" 
              style={{ backgroundColor: defaultColor }}
            />
          )}
          {tool.id === 'circle' && (
            <div 
              className="w-6 h-6 rounded-full transition-colors" 
              style={{ backgroundColor: defaultColor }}
            />
          )}
          {tool.id === 'triangle' && (
            <div 
              className="w-0 h-0" 
              style={{
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderBottom: `20px solid ${defaultColor}`,
              }}
            />
          )}
        {tool.id === 'line' && (
          <div 
            className="w-7 h-0.5 rotate-45 transition-colors" 
            style={{ backgroundColor: defaultColor }}
          />
        )}
        {tool.id === 'text' && (
          <div className="w-6 h-6 flex items-center justify-center">
            <span 
              className="font-bold text-lg transition-colors" 
              style={{ color: defaultColor }}
            >
              T
            </span>
          </div>
        )}
          {/* Tooltip */}
          <span className="absolute left-14 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Divider */}
      <div className="w-8 h-px bg-gray-300 my-1" />

      {/* Enhanced Color Picker Button */}
      <button
        ref={colorPickerRef}
        onClick={handleColorPickerToggle}
        className="w-10 h-10 rounded flex items-center justify-center text-lg hover:bg-indigo-50 hover:scale-110 transition-all text-indigo-600 cursor-pointer"
        title="Color Picker (P) - Click to open"
      >
        🎨
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-gray-300 my-1" />

      {/* Zoom Display */}
      <div className="w-10 h-10 rounded flex items-center justify-center bg-gray-50 border border-gray-200">
        <span className="text-xs font-mono font-semibold text-gray-700">
          {Math.round(viewport.scale * 100)}%
        </span>
      </div>

      {/* Compact Color Picker Modal */}
      {showColorPicker && (
        <CompactColorPicker
          onClose={() => setShowColorPicker(false)}
          initialColor={
            selectedIds.length > 0
              ? (rectangles.find(r => r.id === selectedIds[0])?.color || defaultColor)
              : defaultColor
          }
          initialOpacity={
            selectedIds.length > 0
              ? (rectangles.find(r => r.id === selectedIds[0])?.opacity || defaultOpacity)
              : defaultOpacity
          }
          onColorChange={handleColorChange}
          position={colorPickerPosition}
        />
      )}
    </div>
  );
};

