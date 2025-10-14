// Authentication service
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User 
} from 'firebase/auth';
import { auth } from './firebase';

export const authService = {
  signUp: async (email: string, password: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  signIn: async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  signOut: async (): Promise<void> => {
    await firebaseSignOut(auth);
  },

  getCurrentUser: (): User | null => {
    return auth.currentUser;
  }
};

