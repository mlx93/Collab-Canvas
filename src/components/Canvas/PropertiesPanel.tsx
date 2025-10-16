// Properties Panel component - Shows properties of selected rectangle
import React, { useState } from 'react';
import { PREDEFINED_COLORS } from '../../utils/constants';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';
import { setActiveEdit, clearActiveEdit, getUserCursorColor } from '../../services/activeEdits.service';

export const PropertiesPanel: React.FC = () => {
  const { rectangles, selectedRectangleId, updateRectangle, deleteRectangle, setSelectedRectangle, setZIndex } = useCanvas();
  const { user } = useAuth();
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [zIndexInput, setZIndexInput] = useState<string>(''); // Local state for z-index input

  // Get selected rectangle
  const selectedRectangle = rectangles.find(r => r.id === selectedRectangleId);

  // Sync zIndexInput with selectedRectangle.zIndex when it changes
  React.useEffect(() => {
    if (selectedRectangle) {
      setZIndexInput(selectedRectangle.zIndex.toString());
    }
  }, [selectedRectangle]);

  // Get color name for display
  const getColorName = (hex: string): string => {
    const entry = Object.entries(PREDEFINED_COLORS).find(([_, value]) => value === hex);
    return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : 'Custom';
  };

  // Handle color change
  const handleColorChange = (newColor: string) => {
    if (!selectedRectangle) return;
    
    // Set active edit for recoloring
    if (user) {
      const cursorColor = getUserCursorColor(user.email);
      setActiveEdit(selectedRectangle.id, user.userId, user.email, user.firstName, 'recoloring', cursorColor);
    }
    
    updateRectangle(selectedRectangle.id, {
      color: newColor,
      lastModifiedBy: user?.email || selectedRectangle.createdBy,
    });
    setIsColorDropdownOpen(false);
    
    // Clear active edit after a short delay (color change is instant)
    setTimeout(() => {
      if (selectedRectangle) {
        clearActiveEdit(selectedRectangle.id);
      }
    }, 500);
  };

  // Handle z-index change
  const handleZIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setZIndexInput(value); // Allow any input temporarily

    // Only update context if valid positive integer
    if (!selectedRectangle) return;
    const newZIndex = parseInt(value, 10);
    if (!isNaN(newZIndex) && newZIndex >= 1) {
      setZIndex(selectedRectangle.id, newZIndex);
    }
  };

  // Handle z-index blur - reset to actual value if invalid
  const handleZIndexBlur = () => {
    if (selectedRectangle) {
      setZIndexInput(selectedRectangle.zIndex.toString());
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedRectangle) return;
    deleteRectangle(selectedRectangle.id);
    setSelectedRectangle(null);
  };

  // Handle keyboard delete (Delete/Backspace) - MUST be before any conditional returns
  React.useEffect(() => {
    if (!selectedRectangle) return; // Early exit inside hook is OK

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent default backspace navigation
        if (e.key === 'Backspace' && e.target instanceof HTMLElement && 
            ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          return; // Allow backspace in input fields
        }
        e.preventDefault();
        // Delete inline to avoid dependency issues
        deleteRectangle(selectedRectangle.id);
        setSelectedRectangle(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRectangle, deleteRectangle, setSelectedRectangle]);

  // If nothing selected, show empty state
  if (!selectedRectangle) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Properties</h3>
        <p className="text-xs text-gray-500">
          Select a rectangle to view properties
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Properties</h3>

      {/* Color Picker */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Color
        </label>
        <div className="relative">
          <button
            onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
            className="w-full h-10 rounded-md border-2 border-gray-300 hover:border-blue-500 transition-colors flex items-center px-3 space-x-2"
            style={{ backgroundColor: selectedRectangle.color }}
          >
            <span className="text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-0.5 rounded">
              {getColorName(selectedRectangle.color)}
            </span>
          </button>

          {/* Color Dropdown */}
          {isColorDropdownOpen && (
            <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 grid grid-cols-5 gap-2">
              {Object.entries(PREDEFINED_COLORS).map(([name, hex]) => (
                <button
                  key={name}
                  onClick={() => handleColorChange(hex)}
                  className="w-10 h-10 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: hex,
                    borderColor: selectedRectangle.color === hex ? '#1565C0' : '#D1D5DB',
                  }}
                  title={name.charAt(0).toUpperCase() + name.slice(1)}
                >
                  <span className="sr-only">{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Z-Index Input (Editable) */}
      <div>
        <label htmlFor="zindex" className="block text-xs font-medium text-gray-600 mb-2">
          Z-Index (Layer Order)
        </label>
        <input
          id="zindex"
          type="text"
          value={zIndexInput}
          onChange={handleZIndexChange}
          onBlur={handleZIndexBlur}
          placeholder="Enter layer number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">1 = back, higher = front</p>
      </div>

      {/* Shape-specific size properties */}
      {selectedRectangle.type === 'rectangle' && (
        <>
          {/* Width Display (Read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Width
            </label>
            <input
              type="text"
              value={`${Math.round(selectedRectangle.width)}px`}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 cursor-not-allowed"
            />
          </div>

          {/* Height Display (Read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Height
            </label>
            <input
              type="text"
              value={`${Math.round(selectedRectangle.height)}px`}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 cursor-not-allowed"
            />
          </div>
        </>
      )}

      {/* X Position Display (Read-only) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          X Position
        </label>
        <input
          type="text"
          value={`${Math.round(selectedRectangle.x)}px`}
          readOnly
          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 cursor-not-allowed"
        />
      </div>

      {/* Y Position Display (Read-only) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Y Position
        </label>
        <input
          type="text"
          value={`${Math.round(selectedRectangle.y)}px`}
          readOnly
          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 cursor-not-allowed"
        />
      </div>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors font-medium text-sm"
      >
        Delete Rectangle
      </button>

      <p className="text-xs text-gray-500 mt-2">
        Press Delete or Backspace key to delete
      </p>
    </div>
  );
};
