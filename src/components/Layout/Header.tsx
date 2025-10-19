// Header component with app title, FPS counter, and logout
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePresence } from '../../hooks/usePresence';
import { ProfileEditModal } from '../Profile/ProfileEditModal';
import { ActiveUsers } from '../Collaboration/ActiveUsers';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface HeaderProps {
  fps?: number;
  showFPS?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ fps = 0, showFPS = true }) => {
  const { user, signOut } = useAuth();
  const { onlineUsers } = usePresence();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Display name: firstName lastName, or email if no name set
  const displayName = user?.firstName && user.firstName !== 'User' 
    ? `${user.firstName} ${user.lastName}`.trim()
    : user?.email;

  return (
    <>
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          {/* Brand Icon */}
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
            <span className="text-white text-xl font-bold">C</span>
          </div>
          
          {/* Brand Name */}
          <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            CollabCanvas
          </h1>
          
          {/* Divider */}
          <div className="w-px h-6 bg-gray-200"></div>
          
          {/* User Info */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-800">{displayName}</span>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
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

        {/* Right: Active Users + FPS Counter + Shortcuts + Logout */}
        <div className="flex items-center space-x-3">
          {/* Active Users */}
          <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
            <ActiveUsers users={onlineUsers} currentUserId={user?.userId} />
          </div>

          {/* FPS Counter (dev mode only) */}
          {showFPS && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-xs font-mono text-gray-500">FPS:</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  fps >= 55
                    ? 'text-emerald-600'
                    : fps >= 30
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {Math.round(fps)}
              </span>
            </div>
          )}

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all hover:shadow-sm"
            title="Keyboard Shortcuts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {/* Logout Button */}
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all hover:shadow-sm"
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

    {/* Keyboard Shortcuts Modal */}
    {showShortcuts && (
      <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
    )}
  </>
  );
};
