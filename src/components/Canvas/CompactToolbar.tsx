// Compact vertical toolbar with icon-based shape creation
import React, { useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';

export const CompactToolbar: React.FC = () => {
  const { addRectangle, addCircle, addTriangle, addLine, addText } = useCanvas();
  const [activeTool, setActiveTool] = useState<string | null>(null);

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

      {/* Color Picker Button - Will be enhanced in Phase 4 */}
      <button
        className="w-10 h-10 rounded flex items-center justify-center text-lg hover:bg-gray-100 relative group"
        title="Color Picker (P)"
        disabled
      >
        🎨
        {/* Tooltip */}
        <span className="absolute left-14 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Color Picker (Coming in Phase 4)
        </span>
      </button>
    </div>
  );
};

