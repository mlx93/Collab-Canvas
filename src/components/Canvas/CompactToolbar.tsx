// Compact vertical toolbar with icon-based shape creation
import React, { useState, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { ShortcutsLegend } from './ShortcutsLegend';
import { CompactColorPicker } from './CompactColorPicker';

export const CompactToolbar: React.FC = () => {
  const { addRectangle, addCircle, addTriangle, addLine, addText, selectedIds, updateShape, defaultColor, defaultOpacity, setDefaultColor } = useCanvas();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const colorPickerRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Keyboard shortcut for color picker (P key)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
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
          {/* Shape icons - all CSS-styled and grey */}
          {tool.id === 'rectangle' && (
            <div className="w-6 h-6 bg-gray-600 rounded-sm" />
          )}
          {tool.id === 'circle' && (
            <div className="w-6 h-6 rounded-full bg-gray-600" />
          )}
          {tool.id === 'triangle' && (
            <div 
              className="w-0 h-0" 
              style={{
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderBottom: '20px solid rgb(75, 85, 99)', // gray-600
              }}
            />
          )}
        {tool.id === 'line' && (
          <div 
            className="w-7 h-0.5 bg-gray-600 rotate-45" 
          />
        )}
        {tool.id === 'text' && (
          <div className="w-6 h-6 flex items-center justify-center">
            <span className="text-gray-600 font-bold text-lg">T</span>
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
        onMouseEnter={() => {
          if (!showColorPicker) {
            handleColorPickerToggle();
          }
        }}
        className="w-10 h-10 rounded flex items-center justify-center text-lg hover:bg-gray-100 transition-colors text-blue-600 cursor-pointer"
        title="Color Picker (P)"
      >
        🎨
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-gray-300 my-1" />

      {/* Keyboard Shortcuts Legend */}
      <ShortcutsLegend />

      {/* Compact Color Picker Modal */}
      {showColorPicker && (
        <CompactColorPicker
          onClose={() => setShowColorPicker(false)}
          initialColor={selectedIds.length > 0 ? "#000000" : defaultColor}
          initialOpacity={selectedIds.length > 0 ? 1 : defaultOpacity}
          onColorChange={handleColorChange}
          position={colorPickerPosition}
        />
      )}
    </div>
  );
};

