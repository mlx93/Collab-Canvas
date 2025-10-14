// Main layout component with 3-column structure
import React, { ReactNode } from 'react';

interface MainLayoutProps {
  header: ReactNode;
  toolbar: ReactNode;
  canvas: ReactNode;
  properties: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  header,
  toolbar,
  canvas,
  properties
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Header - spans full width */}
      <div className="flex-none">
        {header}
      </div>

      {/* Main content area with 3 columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="flex-none w-16 bg-white border-r border-gray-200 shadow-sm">
          {toolbar}
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
          {canvas}
        </div>

        {/* Right Properties Panel */}
        <div className="flex-none w-72 bg-white border-l border-gray-200 shadow-sm overflow-y-auto">
          {properties}
        </div>
      </div>
    </div>
  );
};
