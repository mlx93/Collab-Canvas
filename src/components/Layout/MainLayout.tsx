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
  const [showLayers, setShowLayers] = useState(false);
  
  // Listen for toggle layers event from PropertiesPanel
  useEffect(() => {
    const handleToggleLayers = () => {
      setShowLayers(prev => !prev);
    };
    
    window.addEventListener('toggleLayers', handleToggleLayers);
    return () => window.removeEventListener('toggleLayers', handleToggleLayers);
  }, []);
  
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
        <div className={`fixed right-0 top-16 bottom-0 transition-transform duration-300 z-20 ${hasSelection ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex h-full">
            {/* Properties Panel */}
            <div className="w-72 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
              {hasSelection && properties}
            </div>
            
            {/* Layers Panel */}
            {layers && showLayers && (
              <div className="w-60 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
                {layers}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
