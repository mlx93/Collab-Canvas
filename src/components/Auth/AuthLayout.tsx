// AuthLayout component - Container for auth forms
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 p-8">
          {/* Logo + Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">C</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                CollabCanvas
              </h1>
            </div>
            <p className="text-gray-600 text-sm">Real-time collaborative design tool</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

