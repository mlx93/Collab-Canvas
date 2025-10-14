// Unit tests for auth service
import { authService } from '../auth.service';

// Mock Firebase modules
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null
  },
  db: {}
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn()
}));

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { setDoc, getDoc } from 'firebase/firestore';

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error in tests for cleaner output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signUp', () => {
    it('should validate email and password are provided', async () => {
      await expect(authService.signUp('', 'password', 'John', 'Doe')).rejects.toThrow('Email, password, first name, and last name are required');
      await expect(authService.signUp('test@example.com', '', 'John', 'Doe')).rejects.toThrow('Email, password, first name, and last name are required');
      await expect(authService.signUp('test@example.com', 'password', '', 'Doe')).rejects.toThrow('Email, password, first name, and last name are required');
      await expect(authService.signUp('test@example.com', 'password', 'John', '')).rejects.toThrow('Email, password, first name, and last name are required');
    });

    it('should validate password is at least 6 characters', async () => {
      await expect(authService.signUp('test@example.com', '12345', 'John', 'Doe')).rejects.toThrow('Password must be at least 6 characters');
    });

    it('should create user in Firebase Auth and Firestore', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com'
      };

      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.signUp('test@example.com', 'password123', 'John', 'Doe');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(setDoc).toHaveBeenCalled();
      expect(result.email).toBe('test@example.com');
      expect(result.userId).toBe('test-uid');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should handle Firebase Auth errors', async () => {
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(
        new Error('Email already in use')
      );

      await expect(authService.signUp('test@example.com', 'password123', 'John', 'Doe')).rejects.toThrow('Email already in use');
    });
  });

  describe('signIn', () => {
    it('should validate email and password are provided', async () => {
      await expect(authService.signIn('', 'password')).rejects.toThrow('Email and password are required');
      await expect(authService.signIn('test@example.com', '')).rejects.toThrow('Email and password are required');
    });

    it('should sign in user and fetch user document', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com'
      };

      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockUser
      });
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          createdAt: new Date().toISOString()
        })
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(result.email).toBe('test@example.com');
    });

    it('should handle invalid credentials', async () => {
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      await expect(authService.signIn('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should call Firebase signOut', async () => {
      (firebaseSignOut as jest.Mock).mockResolvedValue(undefined);

      await authService.signOut();

      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should handle signOut errors', async () => {
      (firebaseSignOut as jest.Mock).mockRejectedValue(new Error('Sign out failed'));

      await expect(authService.signOut()).rejects.toThrow('Sign out failed');
    });
  });
});

