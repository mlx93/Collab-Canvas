// Header component with app title, FPS counter, and logout
import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  fps?: number;
  showFPS?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ fps = 0, showFPS = true }) => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-14 px-6">
        {/* Left: App Title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">CollabCanvas</h1>
          <span className="text-sm text-gray-500">|</span>
          <span className="text-sm text-gray-600">{user?.email}</span>
        </div>

        {/* Right: FPS Counter + Logout */}
        <div className="flex items-center space-x-4">
          {/* FPS Counter (dev mode only) */}
          {showFPS && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-gray-500">FPS:</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  fps >= 55
                    ? 'text-green-600'
                    : fps >= 30
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {Math.round(fps)}
              </span>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={signOut}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};
