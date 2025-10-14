// Header component with app title, FPS counter, and logout
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileEditModal } from '../Profile/ProfileEditModal';

interface HeaderProps {
  fps?: number;
  showFPS?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ fps = 0, showFPS = true }) => {
  const { user, signOut } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Display name: firstName lastName, or email if no name set
  const displayName = user?.firstName && user.firstName !== 'User' 
    ? `${user.firstName} ${user.lastName}`.trim()
    : user?.email;

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-14 px-6">
        {/* Left: App Title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">CollabCanvas</h1>
          <span className="text-sm text-gray-500">|</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{displayName}</span>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit profile"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </button>
          </div>
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

    {/* Profile Edit Modal */}
    <ProfileEditModal 
      isOpen={isProfileModalOpen} 
      onClose={() => setIsProfileModalOpen(false)} 
    />
  </>
  );
};
