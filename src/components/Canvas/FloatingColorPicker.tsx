import React, { useState, useEffect } from 'react';

interface FloatingColorPickerProps {
  onClose: () => void;
  initialColor?: string;
  initialOpacity?: number;
  onColorChange: (color: string, opacity: number) => void;
}

export function FloatingColorPicker({
  onClose,
  initialColor = '#000000',
  initialOpacity = 1,
  onColorChange
}: FloatingColorPickerProps) {
  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentColors');
    return saved ? JSON.parse(saved) : [];
  });

  const PRESET_COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Magenta', hex: '#FF00FF' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Pink', hex: '#FFC0CB' },
    { name: 'Brown', hex: '#A52A2A' },
    { name: 'Gray', hex: '#808080' },
    { name: 'Light Blue', hex: '#ADD8E6' },
    { name: 'Light Green', hex: '#90EE90' },
    { name: 'Light Red', hex: '#FFB6C1' },
    { name: 'Dark Blue', hex: '#000080' },
    { name: 'Dark Green', hex: '#006400' },
    { name: 'Dark Red', hex: '#8B0000' },
    { name: 'Gold', hex: '#FFD700' }
  ];

  const applyColor = () => {
    onColorChange(color, opacity);
    addToRecentColors(color);
    onClose();
  };

  const addToRecentColors = (newColor: string) => {
    const updated = [newColor, ...recentColors.filter(c => c !== newColor)].slice(0, 10);
    localStorage.setItem('recentColors', JSON.stringify(updated));
    setRecentColors(updated);
  };

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-20 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Picker Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl p-4 w-72 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Color Picker</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Current Color Preview */}
        <div className="mb-3">
          <div 
            className="w-full h-12 rounded border-2"
            style={{ backgroundColor: color, opacity }}
          />
        </div>
        
        {/* Recent Colors */}
        {recentColors.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-gray-600 mb-1 block">Recent</label>
            <div className="flex gap-2 flex-wrap">
              {recentColors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded border hover:scale-110 transition"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Preset Colors (4x5 grid, 20 colors) */}
        <div className="mb-3">
          <label className="text-xs text-gray-600 mb-1 block">Presets</label>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map(({ name, hex }) => (
              <button
                key={name}
                onClick={() => setColor(hex)}
                className="w-10 h-10 rounded border-2 hover:scale-110 transition"
                style={{ 
                  backgroundColor: hex,
                  borderColor: color === hex ? '#2196F3' : '#E5E7EB'
                }}
                title={name}
              />
            ))}
          </div>
        </div>
        
        {/* Hex Input */}
        <div className="mb-3">
          <label className="text-xs text-gray-600 mb-1 block">Hex</label>
          <input
            type="text"
            value={color}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                setColor(val);
              }
            }}
            className="w-full px-2 py-1 border rounded text-sm font-mono"
            placeholder="#FF0000"
          />
        </div>
        
        {/* Opacity Slider */}
        <div className="mb-4">
          <label className="text-xs text-gray-600 mb-1 block">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity * 100}
            onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
            className="w-full"
          />
        </div>
        
        {/* Apply Button */}
        <button
          onClick={applyColor}
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
