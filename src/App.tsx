import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CanvasProvider } from './context/CanvasContext';
import { useAuth } from './hooks/useAuth';
import { useFPS } from './hooks/useFPS';
import { AuthLayout } from './components/Auth/AuthLayout';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';
import { MainLayout } from './components/Layout/MainLayout';
import { Header } from './components/Layout/Header';
import { Canvas } from './components/Canvas/Canvas';
import './App.css';

// Temporary Toolbar placeholder (will be built in PR #4)
const Toolbar: React.FC = () => {
  return (
    <div className="flex flex-col items-center py-4 space-y-4">
      <div className="text-xs text-gray-400 text-center">
        Toolbar
        <br />
        (PR #4)
      </div>
    </div>
  );
};

// Temporary Properties panel placeholder (will be built in PR #4)
const PropertiesPanel: React.FC = () => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Properties</h3>
      <p className="text-xs text-gray-500">
        Select a rectangle to view properties
      </p>
      <p className="text-xs text-gray-400 mt-4">
        (Full panel in PR #4)
      </p>
    </div>
  );
};

// Protected route component that shows canvas when authenticated
const ProtectedCanvas: React.FC = () => {
  const fps = useFPS({ sampleSize: 60 });

  return (
    <CanvasProvider>
      <MainLayout
        header={<Header fps={fps} showFPS={process.env.NODE_ENV === 'development'} />}
        toolbar={<Toolbar />}
        canvas={<Canvas />}
        properties={<PropertiesPanel />}
      />
    </CanvasProvider>
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
