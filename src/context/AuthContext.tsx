// Authentication Context with React Context API
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/auth.service';
import { User, AuthState } from '../types/user.types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
    const unsubscribe = authService.onAuthStateChange((firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in - fetch user doc from Firestore to get firstName/lastName
        import('../services/firebase').then(({ db }) => {
          import('firebase/firestore').then(({ doc, getDoc }) => {
            getDoc(doc(db, 'users', firebaseUser.uid))
              .then((userDoc) => {
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  const user: User = {
                    userId: firebaseUser.uid,
                    email: firebaseUser.email!,
                    firstName: userData.firstName || 'User',
                    lastName: userData.lastName || '',
                    createdAt: new Date(userData.createdAt)
                  };
                  setAuthState({ user, loading: false, error: null });
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
              })
              .catch((error) => {
                console.error('Error fetching user data:', error);
                // Fallback user
                const user: User = {
                  userId: firebaseUser.uid,
                  email: firebaseUser.email!,
                  firstName: 'User',
                  lastName: '',
                  createdAt: new Date()
                };
                setAuthState({ user, loading: false, error: null });
              });
          });
        });
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

  const signOut = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
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

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const value: AuthContextType = {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signUp,
    signIn,
    signOut,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

