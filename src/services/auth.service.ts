// Authentication service
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types/user.types';

/**
 * Convert Firebase auth error codes to user-friendly messages
 */
const getAuthErrorMessage = (error: any): string => {
  const errorCode = error.code || '';
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in or use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};

/**
 * Fetch user data from Firestore by userId
 * Helper function for getting full user profile including firstName/lastName
 */
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        userId,
        email: userData.email,
        firstName: userData.firstName || 'User',
        lastName: userData.lastName || '',
        createdAt: new Date(userData.createdAt)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

/**
 * Update user profile (firstName, lastName) in Firestore
 * Used for profile editing and migrating legacy accounts
 */
async function updateUserProfile(userId: string, firstName: string, lastName: string): Promise<void> {
  try {
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required');
    }
    if (firstName.trim().length === 0) {
      throw new Error('First name cannot be empty');
    }
    if (lastName.trim().length === 0) {
      throw new Error('Last name cannot be empty');
    }

    // Check if user document exists
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      // Update existing document
      await setDoc(userDocRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim()
      }, { merge: true });
    } else {
      // Create new document for legacy users
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      await setDoc(userDocRef, {
        userId,
        email: user.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export const authService = {
  /**
   * Fetch user data from Firestore (exposed for AuthContext)
   */
  fetchUserData,

  /**
   * Update user profile (exposed for profile editing)
   */
  updateUserProfile,

  /**
   * Sign up a new user with email, password, first name, and last name
   * Creates user in Firebase Auth and stores user document in Firestore
   * Email serves as unique identifier
   */
  signUp: async (email: string, password: string, firstName: string, lastName: string): Promise<User> => {
    try {
      // Validate inputs
      if (!email || !password || !firstName || !lastName) {
        throw new Error('Email, password, first name, and last name are required');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      if (firstName.trim().length === 0) {
        throw new Error('First name cannot be empty');
      }
      if (lastName.trim().length === 0) {
        throw new Error('Last name cannot be empty');
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const user: User = {
        userId: firebaseUser.uid,
        email: firebaseUser.email!,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...user,
        createdAt: user.createdAt.toISOString()
      });

      return user;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Sign in existing user with email and password
   */
  signIn: async (email: string, password: string): Promise<User> => {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          userId: firebaseUser.uid,
          email: firebaseUser.email!,
          firstName: userData.firstName || 'User', // Default for old accounts
          lastName: userData.lastName || '',
          createdAt: new Date(userData.createdAt)
        };
      }

      // If user document doesn't exist, create it (backwards compatibility)
      const user: User = {
        userId: firebaseUser.uid,
        email: firebaseUser.email!,
        firstName: 'User', // Default for accounts created before firstName was added
        lastName: '',
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...user,
        createdAt: user.createdAt.toISOString()
      });

      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Sign out current user
   */
  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Get current Firebase user
   */
  getCurrentUser: (): FirebaseUser | null => {
    return auth.currentUser;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};

