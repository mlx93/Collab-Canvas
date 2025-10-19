// FPS Counter component for performance monitoring
import React from 'react';
import { useFPS } from '../../hooks/useFPS';

interface FPSCounterProps {
  show?: boolean;
}

export const FPSCounter: React.FC<FPSCounterProps> = ({ show = true }) => {
  const fps = useFPS({ sampleSize: 60 });

  if (!show) return null;

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-md shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <span className="text-xs font-medium">FPS:</span>
        <span
          className={`text-lg font-bold font-mono ${
            fps >= 55
              ? 'text-green-400'
              : fps >= 30
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}
        >
          {Math.round(fps)}
        </span>
      </div>
    </div>
  );
};
