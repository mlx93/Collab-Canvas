import React, { useState, useEffect, useRef } from 'react';

interface EnhancedColorPickerProps {
  onClose: () => void;
  initialColor?: string;
  initialOpacity?: number;
  onColorChange: (color: string, opacity: number) => void;
}

export function EnhancedColorPicker({
  onClose,
  initialColor = '#000000',
  initialOpacity = 1,
  onColorChange
}: EnhancedColorPickerProps) {
  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentColors');
    return saved ? JSON.parse(saved) : [];
  });
  // const [isDragging, setIsDragging] = useState(false); // Removed - not used in current implementation
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
    if (e.buttons === 1) { // Only if left mouse button is pressed
      handleGradientClick(e);
    }
  };

  const handleGradientWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2 : 2; // Scroll down decreases lightness, scroll up increases
    const newLightness = Math.max(0, Math.min(100, lightness + delta));
    setLightness(newLightness);
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
    if (e.buttons === 1) { // Only if left mouse button is pressed
      handleHueClick(e);
    }
  };

  const handleHueWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5; // Scroll down decreases hue, scroll up increases
    const newHue = Math.max(0, Math.min(360, hue + delta));
    setHue(newHue);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-20 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Picker Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl p-6 w-96 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Color Picker</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Current Color Preview */}
        <div className="mb-4">
          <div className="flex gap-4">
            <div 
              className="w-16 h-16 rounded-lg border-2 border-gray-300"
              style={{ backgroundColor: color, opacity }}
            />
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">Current Color</div>
              <div className="text-lg font-mono">{color.toUpperCase()}</div>
              <div className="text-sm text-gray-500">
                HSL: {Math.round(hue)}°, {Math.round(saturation)}%, {Math.round(lightness)}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Saturation/Lightness Gradient */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">Saturation & Lightness</label>
          <div className="relative">
            <canvas
              ref={gradientRef}
              width={200}
              height={200}
              className="border border-gray-300 rounded cursor-crosshair select-none"
              onClick={handleGradientClick}
              onMouseMove={handleGradientMouseMove}
              onMouseDown={handleGradientClick}
              onWheel={handleGradientWheel}
            />
            {/* Crosshair indicator */}
            <div
              className="absolute w-4 h-4 border-2 border-white rounded-full pointer-events-none transition-all duration-100"
              style={{
                left: (saturation / 100) * 200 - 8,
                top: ((100 - lightness) / 100) * 200 - 8,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        </div>
        
        {/* Hue Slider */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">Hue</label>
          <div className="relative">
            <canvas
              ref={hueRef}
              width={200}
              height={20}
              className="border border-gray-300 rounded cursor-pointer select-none"
              onClick={handleHueClick}
              onMouseMove={handleHueMouseMove}
              onMouseDown={handleHueClick}
              onWheel={handleHueWheel}
            />
            {/* Hue indicator */}
            <div
              className="absolute w-3 h-6 border-2 border-white rounded pointer-events-none top-1 transition-all duration-100"
              style={{
                left: (hue / 360) * 200 - 6,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        </div>
        
        {/* Opacity Slider */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <div className="relative">
            <div className="h-6 bg-gradient-to-r from-transparent to-gray-400 rounded border border-gray-300">
              <input
                type="range"
                min="0"
                max="100"
                value={opacity * 100}
                onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
        
        {/* Hex Input */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">Hex</label>
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
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="#FF0000"
          />
        </div>
        
        {/* Recent Colors */}
        {recentColors.length > 0 && (
          <div className="mb-4">
            <label className="text-sm text-gray-600 mb-2 block">Recent Colors</label>
            <div className="flex gap-2 flex-wrap">
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
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Keyboard Shortcuts Help */}
        <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <div className="font-medium mb-1">Keyboard Shortcuts:</div>
          <div>← → Hue | ↑ ↓ Lightness | Shift + ← → Saturation | Scroll wheel on sliders</div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={applyColor}
            className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Apply
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
