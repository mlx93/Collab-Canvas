// Authentication Context with React Context API
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/auth.service';
import { setUserOffline } from '../services/presence.service';
import { User, AuthState } from '../types/user.types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ needsProfileCompletion: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in - fetch full user data from Firestore
        const userData = await authService.fetchUserData(firebaseUser.uid);
        if (userData) {
          setAuthState({ user: userData, loading: false, error: null });
        } else {
          // Fallback for users without Firestore doc
          const user: User = {
            userId: firebaseUser.uid,
            email: firebaseUser.email!,
            firstName: 'User',
            lastName: '',
            createdAt: new Date()
          };
          setAuthState({ user, loading: false, error: null });
        }
      } else {
        // User is signed out
        setAuthState({ user: null, loading: false, error: null });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const user = await authService.signUp(email, password, firstName, lastName);
      setAuthState({ user, loading: false, error: null });
      toast.success('Account created successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign up';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(errorMessage);
      throw error;
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const user = await authService.signIn(email, password);
      setAuthState({ user, loading: false, error: null });
      toast.success('Signed in successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(errorMessage);
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<{ needsProfileCompletion: boolean }> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const { user, needsProfileCompletion } = await authService.signInWithGoogle();
      setAuthState({ user, loading: false, error: null });
      
      if (needsProfileCompletion) {
        toast.success('Signed in with Google! Please complete your profile.');
      } else {
        toast.success('Signed in with Google successfully!');
      }
      
      return { needsProfileCompletion };
    } catch (error: any) {
      // Don't show error for cancelled popup
      const errorMessage = error.message || 'Failed to sign in with Google';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      if (errorMessage !== 'Sign in cancelled') {
        toast.error(errorMessage);
      }
      
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Clean up presence BEFORE signing out to ensure it completes
      if (authState.user?.userId) {
        console.log('[AuthContext] Cleaning up presence before sign-out:', authState.user.userId);
        await setUserOffline(authState.user.userId);
      }
      
      await authService.signOut();
      setAuthState({ user: null, loading: false, error: null });
      toast.success('Signed out successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign out';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateProfile = async (firstName: string, lastName: string): Promise<void> => {
    try {
      if (!authState.user) {
        throw new Error('No authenticated user');
      }
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await authService.updateUserProfile(authState.user.userId, firstName, lastName);
      
      // Update local state
      const updatedUser: User = {
        ...authState.user,
        firstName,
        lastName
      };
      setAuthState({ user: updatedUser, loading: false, error: null });
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(errorMessage);
      throw error;
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const value: AuthContextType = {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

