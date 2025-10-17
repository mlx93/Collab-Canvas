import React, { useState, useEffect, useRef } from 'react';

interface CompactColorPickerProps {
  onClose: () => void;
  initialColor?: string;
  initialOpacity?: number;
  onColorChange: (color: string, opacity: number) => void;
  position?: { x: number; y: number };
}

export function CompactColorPicker({
  onClose,
  initialColor = '#000000',
  initialOpacity = 1,
  onColorChange,
  position = { x: 0, y: 0 }
}: CompactColorPickerProps) {
  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentColors');
    return saved ? JSON.parse(saved) : [];
  });
  const gradientRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);

  // Convert HSL to Hex
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Convert Hex to HSL
  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  // Initialize HSL values from initial color
  useEffect(() => {
    const hsl = hexToHsl(initialColor);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
  }, [initialColor]);

  // Update color when HSL changes
  useEffect(() => {
    const newColor = hslToHex(hue, saturation, lightness);
    setColor(newColor);
  }, [hue, saturation, lightness]);

  // Draw gradient canvas
  useEffect(() => {
    const canvas = gradientRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create saturation/lightness gradient
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const s = (x / width) * 100;
        const l = 100 - (y / height) * 100;
        const hex = hslToHex(hue, s, l);
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hue]);

  // Draw hue slider
  useEffect(() => {
    const canvas = hueRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create hue gradient
    for (let x = 0; x < width; x++) {
      const h = (x / width) * 360;
      const hex = hslToHex(h, 100, 50);
      ctx.fillStyle = hex;
      ctx.fillRect(x, 0, 1, height);
    }
  }, []);

  const handleGradientClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = gradientRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const s = Math.max(0, Math.min(100, (x / canvas.width) * 100));
    const l = Math.max(0, Math.min(100, 100 - (y / canvas.height) * 100));

    setSaturation(s);
    setLightness(l);
  };

  const handleGradientMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 1) {
      handleGradientClick(e);
    }
  };

  const handleHueClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const h = Math.max(0, Math.min(360, (x / canvas.width) * 360));

    setHue(h);
  };

  const handleHueMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 1) {
      handleHueClick(e);
    }
  };

  const handleHueWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const newHue = Math.max(0, Math.min(360, hue + delta));
    setHue(newHue);
  };

  const applyColor = () => {
    onColorChange(color, opacity);
    addToRecentColors(color);
    onClose();
  };

  const addToRecentColors = (newColor: string) => {
    const updated = [newColor, ...recentColors.filter(c => c !== newColor)].slice(0, 8);
    localStorage.setItem('recentColors', JSON.stringify(updated));
    setRecentColors(updated);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setHue(Math.max(0, hue - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setHue(Math.min(360, hue + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setLightness(Math.min(100, lightness + 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setLightness(Math.max(0, lightness - 1));
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        setSaturation(Math.max(0, saturation - 1));
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        setSaturation(Math.min(100, saturation + 1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, hue, saturation, lightness]);

  return (
    <div 
      className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 p-3 w-80 z-50"
      style={{
        left: position.x,
        top: position.y,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Color Picker</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
      
      {/* Current Color Preview */}
      <div className="mb-2">
        <div 
          className="w-full h-8 rounded border border-gray-300"
          style={{ backgroundColor: color, opacity }}
        />
      </div>
      
      {/* Saturation/Lightness Gradient */}
      <div className="mb-2">
        <div className="relative">
          <canvas
            ref={gradientRef}
            width={160}
            height={120}
            className="border border-gray-300 rounded cursor-crosshair select-none"
            onClick={handleGradientClick}
            onMouseMove={handleGradientMouseMove}
            onMouseDown={handleGradientClick}
          />
          {/* Crosshair indicator */}
          <div
            className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none transition-all duration-100"
            style={{
              left: (saturation / 100) * 160 - 6,
              top: ((100 - lightness) / 100) * 120 - 6,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.3)'
            }}
          />
        </div>
      </div>
      
      {/* Hue Slider */}
      <div className="mb-2">
        <div className="relative">
          <canvas
            ref={hueRef}
            width={160}
            height={16}
            className="border border-gray-300 rounded cursor-pointer select-none"
            onClick={handleHueClick}
            onMouseMove={handleHueMouseMove}
            onMouseDown={handleHueClick}
            onWheel={handleHueWheel}
          />
          {/* Hue indicator */}
          <div
            className="absolute w-2 h-4 border-2 border-white rounded pointer-events-none transition-all duration-100 top-1"
            style={{
              left: (hue / 360) * 160 - 4,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.3)'
            }}
          />
        </div>
      </div>
      
      {/* Opacity Slider */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-12">Opacity:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity * 100}
            onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
            className="flex-1"
          />
          <span className="text-xs text-gray-600 w-8">{Math.round(opacity * 100)}%</span>
        </div>
      </div>
      
      {/* Hex Input */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-12">Hex:</span>
          <input
            type="text"
            value={color}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                setColor(val);
                const hsl = hexToHsl(val);
                setHue(hsl.h);
                setSaturation(hsl.s);
                setLightness(hsl.l);
              }
            }}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
            placeholder="#FF0000"
          />
        </div>
      </div>
      
      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-1">Recent:</div>
          <div className="flex gap-1 flex-wrap">
            {recentColors.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setColor(c);
                  const hsl = hexToHsl(c);
                  setHue(hsl.h);
                  setSaturation(hsl.s);
                  setLightness(hsl.l);
                }}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={applyColor}
          className="flex-1 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
        >
          Apply
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-1.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
