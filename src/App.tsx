import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CanvasProvider } from './context/CanvasContext';
import { UndoProvider } from './context/UndoContext';
import { AIProvider } from './context/AIContext';
import { useAuth } from './hooks/useAuth';
import { useCanvas } from './hooks/useCanvas';
import { useFPS } from './hooks/useFPS';
import { useAIWarmup } from './hooks/useAIWarmup';
import { AuthLayout } from './components/Auth/AuthLayout';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';
import { MainLayout } from './components/Layout/MainLayout';
import { Header } from './components/Layout/Header';
import { Canvas } from './components/Canvas/Canvas';
import { CompactToolbar } from './components/Canvas/CompactToolbar';
import { PropertiesPanel } from './components/Canvas/PropertiesPanel';
import { LayersPanel } from './components/Canvas/LayersPanel';
import { AIChatPanel } from './components/AI/AIChatPanel';
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
          {/* AI Chat Panel - Fixed at bottom-left */}
          <AIChatPanel />
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
  // Warm up AI function on app load to avoid cold start delays
  const { isWarm, isWarming } = useAIWarmup();
  const [showWarmIndicator, setShowWarmIndicator] = useState(true);
  
  // Auto-hide the "AI ready" indicator after 3 seconds
  React.useEffect(() => {
    if (isWarm) {
      const timer = setTimeout(() => setShowWarmIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isWarm]);
  
  return (
    <UndoProvider>
      <CanvasProvider>
        <AIProvider>
          <CanvasLayout />
          {/* Optional: Show warmup indicator - can be removed if too subtle */}
          {isWarming && (
            <div className="fixed bottom-4 right-4 bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 transition-opacity duration-300">
              🔥 AI warming up...
            </div>
          )}
          {isWarm && showWarmIndicator && (
            <div className="fixed bottom-4 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 animate-fade-in">
              ✓ AI ready
            </div>
          )}
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
