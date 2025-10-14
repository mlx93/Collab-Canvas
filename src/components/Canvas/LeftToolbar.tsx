// Left Toolbar component with color picker and create button
import React, { useState } from 'react';
import { PREDEFINED_COLORS, DEFAULT_COLOR } from '../../utils/constants';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';

export const LeftToolbar: React.FC = () => {
  const { addRectangle, viewport, rectangles, selectedRectangleId, stageSize } = useCanvas();
  const { user } = useAuth();
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Create rectangle at center of current viewport
  const handleCreateRectangle = () => {
    if (!user) return;

    // Use the actual rendered canvas dimensions from context
    // These are updated dynamically by the Canvas component on window resize
    const canvasVisibleWidth = stageSize.width;
    const canvasVisibleHeight = stageSize.height;
    
    // Calculate center of visible canvas area in canvas coordinates
    const baseCenterX = -viewport.x / viewport.scale + (canvasVisibleWidth / 2) / viewport.scale - 50;
    const baseCenterY = -viewport.y / viewport.scale + (canvasVisibleHeight / 2) / viewport.scale - 50;

    let targetX = baseCenterX;
    let targetY = baseCenterY;

    // Smart offset: Keep offsetting until we find a non-overlapping position
    // Check if current position overlaps with ANY existing rectangle
    const OVERLAP_THRESHOLD = 50; // px - consider positions within 50px as overlapping
    const OFFSET_AMOUNT = 20; // px - how much to offset each time
    const MAX_ATTEMPTS = 50; // Prevent infinite loop

    let attempt = 0;
    let foundNonOverlappingPosition = false;

    // Helper to check overlap at a given position
    const checkOverlap = (x: number, y: number) => {
      return rectangles.some(rect => {
        const distanceX = Math.abs(rect.x - x);
        const distanceY = Math.abs(rect.y - y);
        return distanceX < OVERLAP_THRESHOLD && distanceY < OVERLAP_THRESHOLD;
      });
    };

    while (attempt < MAX_ATTEMPTS && !foundNonOverlappingPosition) {
      // Check if current position overlaps with any existing rectangle
      const hasOverlap = checkOverlap(targetX, targetY);

      if (!hasOverlap) {
        // Found a non-overlapping position
        foundNonOverlappingPosition = true;
      } else {
        // Position is occupied, offset diagonally
        targetX = baseCenterX + (OFFSET_AMOUNT * (attempt + 1));
        targetY = baseCenterY + (OFFSET_AMOUNT * (attempt + 1));
        attempt++;
      }
    }

    addRectangle({
      x: targetX,
      y: targetY,
      width: 100,
      height: 100,
      color: selectedColor,
      createdBy: user.email,
      lastModifiedBy: user.email,
    });
  };

  // Get color name for display
  const getColorName = (hex: string): string => {
    const entry = Object.entries(PREDEFINED_COLORS).find(([_, value]) => value === hex);
    return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : 'Unknown';
  };

  return (
    <div className="flex flex-col items-center py-4 space-y-4 w-full">
      {/* Color Picker Dropdown */}
      <div className="relative w-14">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-14 h-14 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: selectedColor }}
          title={`Color: ${getColorName(selectedColor)}`}
        >
          <span className="sr-only">Select color</span>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-16 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 space-y-2">
            {Object.entries(PREDEFINED_COLORS).map(([name, hex]) => (
              <button
                key={name}
                onClick={() => {
                  setSelectedColor(hex);
                  setIsDropdownOpen(false);
                }}
                className="w-12 h-12 rounded-md border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: hex,
                  borderColor: selectedColor === hex ? '#1565C0' : '#D1D5DB',
                }}
                title={name.charAt(0).toUpperCase() + name.slice(1)}
              >
                <span className="sr-only">{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Rectangle Button */}
      <button
        onClick={handleCreateRectangle}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center shadow-md"
        title="Create Rectangle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Color Label */}
      <div className="text-xs text-gray-600 text-center w-full px-1">
        {getColorName(selectedColor)}
      </div>
    </div>
  );
};
