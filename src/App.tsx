import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { AuthLayout } from './components/Auth/AuthLayout';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';
import './App.css';

// Protected route component that shows canvas when authenticated
const ProtectedCanvas: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to CollabCanvas</h1>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              Sign Out
            </button>
          </div>
          <div className="text-gray-600 space-y-2">
            <p>✅ Authentication working!</p>
            <p>👤 Logged in as: <span className="font-semibold">{user?.email}</span></p>
            <p className="text-sm text-gray-500 mt-4">
              Canvas UI will be implemented in PR #3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App component wrapped with AuthProvider
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show canvas
  if (user) {
    return <ProtectedCanvas />;
  }

  // If user is not authenticated, show auth forms
  return (
    <AuthLayout>
      {showSignup ? (
        <SignupForm onSwitchToLogin={() => setShowSignup(false)} />
      ) : (
        <LoginForm onSwitchToSignup={() => setShowSignup(true)} />
      )}
    </AuthLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 2000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
