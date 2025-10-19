// Main layout component with 4-column structure
import React, { ReactNode, useState, useEffect } from 'react';

interface MainLayoutProps {
  header: ReactNode;
  toolbar: ReactNode;
  canvas: ReactNode;
  properties: ReactNode;
  layers?: ReactNode; // Layers panel
  hasSelection?: boolean; // Whether a shape is currently selected
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  header,
  toolbar,
  canvas,
  properties,
  layers,
  hasSelection = false
}) => {
  const [showLayers, setShowLayers] = useState(false); // Start with layers panel hidden
  const [previousHasSelection, setPreviousHasSelection] = useState(false);
  
  // Listen for toggle layers event from PropertiesPanel (manual toggle)
  useEffect(() => {
    const handleToggleLayers = () => {
      setShowLayers(prev => !prev);
    };
    
    window.addEventListener('toggleLayers', handleToggleLayers);
    return () => window.removeEventListener('toggleLayers', handleToggleLayers);
  }, []);
  
  // Auto-hide layers panel when selection state changes
  useEffect(() => {
    // Going from no selection to selection: hide layers panel
    if (!previousHasSelection && hasSelection) {
      setShowLayers(false);
    }
    
    // Going from selection to no selection: hide layers panel
    if (previousHasSelection && !hasSelection) {
      setShowLayers(false);
    }
    
    // Keep layers panel state when jumping from shape to shape (both had selection)
    // This is handled automatically by not changing showLayers
    
    setPreviousHasSelection(hasSelection);
  }, [hasSelection, previousHasSelection]);
  
  // Update arrow direction based on showLayers state
  useEffect(() => {
    const arrow = document.getElementById('layers-arrow');
    if (arrow) {
      arrow.textContent = showLayers ? '←' : '→';
    }
  }, [showLayers]);
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Header - spans full width */}
      <div className="flex-none">
        {header}
      </div>

      {/* Main content area with 3 columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Compact Toolbar - 48px (12 in Tailwind = 48px) */}
        <div className="flex-none w-12 bg-white border-r border-gray-200 shadow-sm">
          {toolbar}
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
          {canvas}
        </div>

        {/* Right Panels - fixed position overlay, doesn't affect canvas size */}
        {/* Layers Panel - Only visible when properties panel is visible AND user has toggled it on */}
        {layers && showLayers && hasSelection && (
          <div className="fixed right-0 top-16 bottom-0 z-30 animate-in slide-in-from-right duration-150">
            {layers}
          </div>
        )}
        
        {/* Properties Panel - shows when there's a selection, positioned left of layers panel if layers visible */}
        <div className={`fixed top-16 bottom-0 transition-all duration-150 ease-out z-20 ${
          hasSelection ? 'translate-x-0' : 'translate-x-full'
        } ${showLayers && hasSelection ? 'right-80' : 'right-0'}`}>
          <div className="w-72 bg-white border-l border-gray-200 shadow-lg overflow-y-auto h-full">
            {hasSelection && properties}
          </div>
        </div>
      </div>
    </div>
  );
};
