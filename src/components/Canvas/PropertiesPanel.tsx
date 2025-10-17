// Properties Panel component - Shows properties of selected rectangle
import React, { useState } from 'react';
import { PREDEFINED_COLORS } from '../../utils/constants';
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';
import { setActiveEdit, clearActiveEdit, getUserCursorColor } from '../../services/activeEdits.service';

// Enhanced color palette with translucent options
const TEXT_COLOR_PALETTE = {
  ...PREDEFINED_COLORS,
  'translucent': 'transparent'
};

// Click outside handler for color dropdowns
const useClickOutside = (ref: React.RefObject<HTMLElement | null>, callback: () => void) => {
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
};

export const PropertiesPanel: React.FC = () => {
  const { rectangles, selectedIds, updateRectangle, deleteSelected, setZIndex, bringToFront, sendToBack } = useCanvas();
  const { user } = useAuth();
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [isTextColorDropdownOpen, setIsTextColorDropdownOpen] = useState(false);
  const [isBackgroundColorDropdownOpen, setIsBackgroundColorDropdownOpen] = useState(false);
  const [isBorderColorDropdownOpen, setIsBorderColorDropdownOpen] = useState(false);
  
  // Refs for click-outside detection
  const textColorRef = React.useRef<HTMLDivElement>(null);
  const backgroundColorRef = React.useRef<HTMLDivElement>(null);
  const borderColorRef = React.useRef<HTMLDivElement>(null);
  
  // Click outside handlers
  useClickOutside(textColorRef, () => setIsTextColorDropdownOpen(false));
  useClickOutside(backgroundColorRef, () => setIsBackgroundColorDropdownOpen(false));
  useClickOutside(borderColorRef, () => setIsBorderColorDropdownOpen(false));
  const [zIndexInput, setZIndexInput] = useState<string>(''); // Local state for z-index input
  const [fontSizeInput, setFontSizeInput] = useState<string>(''); // Local state for font size input

  // Get selected shapes
  const selectedShapes = rectangles.filter(r => selectedIds.includes(r.id));
  const selectedRectangle = selectedShapes[0]; // Show properties for first selected shape
  const isMultiSelection = selectedIds.length > 1;

  // Sync zIndexInput with selectedRectangle.zIndex when it changes
  React.useEffect(() => {
    if (selectedRectangle) {
      setZIndexInput(selectedRectangle.zIndex.toString());
    }
  }, [selectedRectangle]);

  // Sync fontSizeInput with selectedRectangle.fontSize when it changes
  React.useEffect(() => {
    if (selectedRectangle && selectedRectangle.type === 'text') {
      const textShape = selectedRectangle as any; // Type assertion for text shape
      setFontSizeInput((textShape.fontSize || 16).toString());
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

  // Handle text color change
  const handleTextColorChange = (newColor: string) => {
    if (!selectedRectangle) return;
    
    updateRectangle(selectedRectangle.id, {
      textColor: newColor,
      lastModifiedBy: user?.email || selectedRectangle.createdBy,
    });
  };

  // Handle background color change
  const handleBackgroundColorChange = (newColor: string) => {
    if (!selectedRectangle) return;
    
    updateRectangle(selectedRectangle.id, {
      backgroundColor: newColor,
      lastModifiedBy: user?.email || selectedRectangle.createdBy,
    });
  };

  // Handle border color change
  const handleBorderColorChange = (newColor: string) => {
    if (!selectedRectangle) return;
    
    updateRectangle(selectedRectangle.id, {
      borderColor: newColor,
      lastModifiedBy: user?.email || selectedRectangle.createdBy,
    });
  };

  // Handle z-index change
  const handleZIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setZIndexInput(value); // Allow any input temporarily

    // Only update context if valid integer within range
    if (!selectedRectangle) return;
    const newZIndex = parseInt(value, 10);
    if (!isNaN(newZIndex) && newZIndex >= -100000000 && newZIndex <= 100000000) {
      setZIndex(selectedRectangle.id, newZIndex);
    }
  };

  // Handle z-index blur - reset to actual value if invalid
  const handleZIndexBlur = () => {
    if (selectedRectangle) {
      const currentValue = parseInt(zIndexInput, 10);
      if (isNaN(currentValue) || currentValue < -100000000 || currentValue > 100000000) {
        // Reset to actual value if invalid
        setZIndexInput(selectedRectangle.zIndex.toString());
      }
    }
  };

  // Handle font size change
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFontSizeInput(value); // Allow any input temporarily

    // Only update context if valid number within range
    if (!selectedRectangle || selectedRectangle.type !== 'text') return;
    const newFontSize = parseInt(value, 10);
    if (!isNaN(newFontSize) && newFontSize >= 1 && newFontSize <= 72) {
      updateRectangle(selectedRectangle.id, { fontSize: newFontSize });
    }
  };

  // Handle font size blur - reset to actual value if invalid
  const handleFontSizeBlur = () => {
    if (selectedRectangle && selectedRectangle.type === 'text') {
      const textShape = selectedRectangle as any; // Type assertion for text shape
      setFontSizeInput((textShape.fontSize || 16).toString());
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    deleteSelected();
  };

  // Handle keyboard delete (Delete/Backspace) - MUST be before any conditional returns
  React.useEffect(() => {
    if (selectedIds.length === 0) return; // Early exit inside hook is OK

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent default backspace navigation
        if (e.key === 'Backspace' && e.target instanceof HTMLElement && 
            ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          return; // Allow backspace in input fields
        }
        e.preventDefault();
        // Use deleteSelected to handle all selected shapes
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, deleteSelected]);

  // If nothing selected, show empty state
  if (selectedIds.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Properties</h3>
        <p className="text-xs text-gray-500">
          Select a shape to view properties
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Properties</h3>
          {isMultiSelection && (
            <p className="text-xs text-blue-600 mt-1">
              {selectedIds.length} shapes selected (showing first)
            </p>
          )}
        </div>

      {/* Color Picker - Only show for non-text shapes */}
      {selectedRectangle.type !== 'text' && (
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
      )}


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
      
      {selectedRectangle.type === 'circle' && (
        <>
          {/* Radius Display (Read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Radius
            </label>
            <input
              type="text"
              value={`${Math.round(selectedRectangle.radius)}px`}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 cursor-not-allowed"
            />
          </div>
        </>
      )}
      
      {selectedRectangle.type === 'triangle' && (
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

      {/* Line-specific properties */}
      {selectedRectangle.type === 'line' && (
        <>
          {/* Stroke Width */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Stroke Width
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={selectedRectangle.strokeWidth || 2}
              onChange={(e) => {
                const strokeWidth = Math.max(1, Math.min(20, parseInt(e.target.value) || 2));
                updateRectangle(selectedRectangle.id, { strokeWidth });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </>
      )}

      {/* Text-specific properties */}
      {selectedRectangle.type === 'text' && (
        <>
          {/* Text Content */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Text Content
            </label>
            <textarea
              value={selectedRectangle.text || ''}
              onChange={(e) => {
                updateRectangle(selectedRectangle.id, { text: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Text Color
            </label>
            <div className="relative" ref={textColorRef}>
              <button
                onClick={() => setIsTextColorDropdownOpen(!isTextColorDropdownOpen)}
                className="w-full h-10 rounded-md border-2 border-gray-300 hover:border-blue-500 transition-colors flex items-center px-3 space-x-2"
                style={{ 
                  backgroundColor: selectedRectangle.textColor || '#000000',
                  backgroundImage: (selectedRectangle.textColor === 'transparent' || !selectedRectangle.textColor) ? 
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
              >
                <span className="text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-0.5 rounded">
                  {selectedRectangle.textColor === 'transparent' ? 'Clear' : 'Text'}
                </span>
              </button>

              {/* Text Color Dropdown */}
              {isTextColorDropdownOpen && (
                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 min-w-[200px]">
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {Object.entries(TEXT_COLOR_PALETTE).map(([name, hex]) => (
                      <button
                        key={name}
                        onClick={() => {
                          handleTextColorChange(hex);
                          setIsTextColorDropdownOpen(false);
                        }}
                        className="w-8 h-8 rounded-md border-2 transition-all hover:scale-110 relative"
                        style={{
                          backgroundColor: hex,
                          borderColor: (selectedRectangle.textColor || '#000000') === hex ? '#1565C0' : '#D1D5DB',
                          backgroundImage: hex === 'transparent' ? 
                            'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                          backgroundSize: '4px 4px',
                          backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
                        }}
                        title={name.charAt(0).toUpperCase() + name.slice(1)}
                      >
                        <span className="sr-only">{name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <button
                      onClick={() => setIsTextColorDropdownOpen(false)}
                      className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 text-center"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Background Color
            </label>
            <div className="relative" ref={backgroundColorRef}>
              <button
                onClick={() => setIsBackgroundColorDropdownOpen(!isBackgroundColorDropdownOpen)}
                className="w-full h-10 rounded-md border-2 border-gray-300 hover:border-blue-500 transition-colors flex items-center px-3 space-x-2"
                style={{ 
                  backgroundColor: selectedRectangle.backgroundColor || '#FFFFFF',
                  backgroundImage: (selectedRectangle.backgroundColor === 'transparent' || !selectedRectangle.backgroundColor) ? 
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
              >
                <span className="text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-0.5 rounded">
                  {selectedRectangle.backgroundColor === 'transparent' ? 'Clear' : 'Background'}
                </span>
              </button>

              {/* Background Color Dropdown */}
              {isBackgroundColorDropdownOpen && (
                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 min-w-[200px]">
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {Object.entries(TEXT_COLOR_PALETTE).map(([name, hex]) => (
                      <button
                        key={name}
                        onClick={() => {
                          handleBackgroundColorChange(hex);
                          setIsBackgroundColorDropdownOpen(false);
                        }}
                        className="w-8 h-8 rounded-md border-2 transition-all hover:scale-110 relative"
                        style={{
                          backgroundColor: hex,
                          borderColor: (selectedRectangle.backgroundColor || '#FFFFFF') === hex ? '#1565C0' : '#D1D5DB',
                          backgroundImage: hex === 'transparent' ? 
                            'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                          backgroundSize: '4px 4px',
                          backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
                        }}
                        title={name.charAt(0).toUpperCase() + name.slice(1)}
                      >
                        <span className="sr-only">{name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <button
                      onClick={() => setIsBackgroundColorDropdownOpen(false)}
                      className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 text-center"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Border Color */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Border Color
            </label>
            <div className="relative" ref={borderColorRef}>
              <button
                onClick={() => setIsBorderColorDropdownOpen(!isBorderColorDropdownOpen)}
                className="w-full h-10 rounded-md border-2 border-gray-300 hover:border-blue-500 transition-colors flex items-center px-3 space-x-2"
                style={{ 
                  backgroundColor: selectedRectangle.borderColor || '#000000',
                  backgroundImage: (selectedRectangle.borderColor === 'transparent' || !selectedRectangle.borderColor) ? 
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
              >
                <span className="text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-0.5 rounded">
                  {selectedRectangle.borderColor === 'transparent' ? 'Clear' : 'Border'}
                </span>
              </button>

              {/* Border Color Dropdown */}
              {isBorderColorDropdownOpen && (
                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 min-w-[200px]">
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {Object.entries(TEXT_COLOR_PALETTE).map(([name, hex]) => (
                      <button
                        key={name}
                        onClick={() => {
                          handleBorderColorChange(hex);
                          setIsBorderColorDropdownOpen(false);
                        }}
                        className="w-8 h-8 rounded-md border-2 transition-all hover:scale-110 relative"
                        style={{
                          backgroundColor: hex,
                          borderColor: (selectedRectangle.borderColor || '#000000') === hex ? '#1565C0' : '#D1D5DB',
                          backgroundImage: hex === 'transparent' ? 
                            'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                          backgroundSize: '4px 4px',
                          backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
                        }}
                        title={name.charAt(0).toUpperCase() + name.slice(1)}
                      >
                        <span className="sr-only">{name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <button
                      onClick={() => setIsBorderColorDropdownOpen(false)}
                      className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 text-center"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Font Size */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Font Size
            </label>
            <input
              type="text"
              value={fontSizeInput}
              onChange={handleFontSizeChange}
              onBlur={handleFontSizeBlur}
              placeholder="Enter font size (1-72)"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Font Family
            </label>
            <select
              value={selectedRectangle.fontFamily || 'Arial'}
              onChange={(e) => {
                updateRectangle(selectedRectangle.id, { fontFamily: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Courier New">Courier New</option>
            </select>
          </div>


          {/* Font Style */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Font Style
            </label>
            <select
              value={selectedRectangle.fontStyle || 'normal'}
              onChange={(e) => {
                updateRectangle(selectedRectangle.id, { fontStyle: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
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

      {/* Z-Index Input (Editable) - Available for all shapes */}
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
          placeholder="Enter layer number (-100M to 100M)"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Lower = back, higher = front (-100M to 100M)</p>
      </div>

      {/* Z-Index Control Buttons - Available for all shapes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Layer Controls
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => selectedRectangle && bringToFront(selectedRectangle.id)}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors"
            title="Bring to front"
          >
            ↑ Front
          </button>
          <button
            onClick={() => selectedRectangle && sendToBack(selectedRectangle.id)}
            className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded-md transition-colors"
            title="Send to back"
          >
            ↓ Back
          </button>
        </div>
      </div>

      </div>
      
      {/* Sticky Delete Button at Bottom */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <button
          onClick={handleDelete}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors font-medium text-sm"
        >
          Delete {selectedIds.length > 1 ? `${selectedIds.length} Shapes` : (selectedRectangle.type === 'text' ? 'Text Box' : 'Shape')}
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Delete or Backspace key to delete
        </p>
      </div>
    </div>
  );
};
