// Main layout component with 3-column structure
import React, { ReactNode } from 'react';

interface MainLayoutProps {
  header: ReactNode;
  toolbar: ReactNode;
  canvas: ReactNode;
  properties: ReactNode;
  hasSelection?: boolean; // Whether a shape is currently selected
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  header,
  toolbar,
  canvas,
  properties,
  hasSelection = false
}) => {
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

        {/* Right Properties Panel - fixed position overlay, doesn't affect canvas size */}
        <div className={`fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 shadow-lg overflow-y-auto transition-transform duration-300 z-20 ${hasSelection ? 'translate-x-0 w-72' : 'translate-x-full w-72'}`}>
          {hasSelection && properties}
        </div>
      </div>
    </div>
  );
};
