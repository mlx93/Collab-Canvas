import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CanvasProvider } from './context/CanvasContext';
import { UndoProvider } from './context/UndoContext';
import { AIProvider } from './context/AIContext';
import { useAuth } from './hooks/useAuth';
import { useCanvas } from './hooks/useCanvas';
import { useFPS } from './hooks/useFPS';
import { AuthLayout } from './components/Auth/AuthLayout';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';
import { MainLayout } from './components/Layout/MainLayout';
import { Header } from './components/Layout/Header';
import { Canvas } from './components/Canvas/Canvas';
import { CompactToolbar } from './components/Canvas/CompactToolbar';
import { PropertiesPanel } from './components/Canvas/PropertiesPanel';
import { LayersPanel } from './components/Canvas/LayersPanel';
import { AIPanel } from './components/AI/AIPanel';
import './App.css';

// Inner component that has access to canvas context
const CanvasLayout: React.FC = () => {
  const fps = useFPS({ sampleSize: 60 });
  const { selectedIds } = useCanvas();

  return (
    <MainLayout
      header={<Header fps={fps} showFPS={false} />}
      toolbar={<CompactToolbar />}
      canvas={
        <>
          <Canvas />
          {/* AI Panel - Fixed at bottom with high z-index for accessibility */}
          <div className="fixed bottom-4 left-16 right-4 z-50 pointer-events-none">
            <div className="max-w-2xl mx-auto pointer-events-auto">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
                <AIPanel />
              </div>
            </div>
          </div>
        </>
      }
      properties={<PropertiesPanel />}
      layers={<LayersPanel />}
      hasSelection={selectedIds.length > 0}
    />
  );
};

// Protected route component that shows canvas when authenticated
const ProtectedCanvas: React.FC = () => {
  return (
    <UndoProvider>
      <CanvasProvider>
        <AIProvider>
          <CanvasLayout />
        </AIProvider>
      </CanvasProvider>
    </UndoProvider>
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
