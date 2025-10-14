import React from 'react';
import { PresenceData } from '../../services/presence.service';
import { getCursorColorForUser } from '../../services/cursor.service';

interface ActiveUsersProps {
  users: PresenceData[];
  currentUserId?: string;
}

export const ActiveUsers: React.FC<ActiveUsersProps> = ({ users, currentUserId }) => {
  return (
    <div className="flex items-center gap-2">
      {/* User count */}
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {users.length} {users.length === 1 ? 'user' : 'users'} online
      </span>

      {/* User avatars */}
      <div className="flex items-center -space-x-2">
        {users.map((userData) => {
          const { cursorColor } = getCursorColorForUser(userData.email);
          const isCurrentUser = userData.userId === currentUserId;
          const displayName = userData.firstName
            ? `${userData.firstName} ${userData.lastName}`
            : userData.email;
          const initials = userData.firstName && userData.lastName
            ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
            : userData.email.substring(0, 2).toUpperCase();

          return (
            <div
              key={userData.userId}
              className="relative group"
              title={displayName}
            >
              {/* Avatar with initials */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-gray-800 cursor-pointer transition-transform hover:scale-110"
                style={{ backgroundColor: cursorColor }}
              >
                {initials}
              </div>

              {/* Online status dot */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-800" />

              {/* Tooltip on hover (below avatar) */}
              <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {displayName} {isCurrentUser && '(you)'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
