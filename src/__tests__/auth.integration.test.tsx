// Integration tests for authentication flow
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { authService } from '../services/auth.service';

// Mock the auth service
jest.mock('../services/auth.service');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Mock Firebase
jest.mock('../services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  rtdb: {}
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockedAuthService.onAuthStateChange = jest.fn((callback) => {
      // Simulate no user initially
      callback(null);
      return jest.fn(); // Return unsubscribe function
    });
  });

  describe('Login Flow', () => {
    it('should display login form by default', () => {
      render(<App />);
      
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should validate email and password on submit', async () => {
      render(<App />);
      
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should call signIn service when form is submitted with valid data', async () => {
      mockedAuthService.signIn = jest.fn().mockResolvedValue({
        userId: 'test-uid',
        email: 'test@example.com',
        createdAt: new Date()
      });

      render(<App />);
      
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockedAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should switch to signup form when clicking sign up link', () => {
      render(<App />);
      
      const signupLink = screen.getByText('Sign up');
      fireEvent.click(signupLink);
      
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByText('Your email will be your username')).toBeInTheDocument();
    });
  });

  describe('Signup Flow', () => {
    it('should display signup form when switching from login', () => {
      render(<App />);
      
      const signupLink = screen.getByText('Sign up');
      fireEvent.click(signupLink);
      
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should validate passwords match', async () => {
      render(<App />);
      
      fireEvent.click(screen.getByText('Sign up'));
      
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'different123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should call signUp service when form is submitted with valid data', async () => {
      mockedAuthService.signUp = jest.fn().mockResolvedValue({
        userId: 'test-uid',
        email: 'test@example.com',
        createdAt: new Date()
      });

      render(<App />);
      
      fireEvent.click(screen.getByText('Sign up'));
      
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should switch back to login form when clicking sign in link', () => {
      render(<App />);
      
      fireEvent.click(screen.getByText('Sign up'));
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      
      // Click the "Sign in" link (not the button)
      const signInLinks = screen.getAllByText('Sign in');
      fireEvent.click(signInLinks[0]);
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });
  });

  describe('Protected Route', () => {
    it('should show canvas when user is authenticated', () => {
      mockedAuthService.onAuthStateChange = jest.fn((callback) => {
        // Simulate authenticated user
        callback({
          uid: 'test-uid',
          email: 'test@example.com',
        } as any);
        return jest.fn();
      });

      mockedAuthService.signOut = jest.fn();

      render(<App />);
      
      expect(screen.getByText('Welcome to CollabCanvas')).toBeInTheDocument();
      expect(screen.getByText(/logged in as:/i)).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should call signOut when sign out button is clicked', () => {
      mockedAuthService.onAuthStateChange = jest.fn((callback) => {
        callback({
          uid: 'test-uid',
          email: 'test@example.com',
        } as any);
        return jest.fn();
      });

      mockedAuthService.signOut = jest.fn();

      render(<App />);
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);
      
      expect(mockedAuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while checking authentication', () => {
      mockedAuthService.onAuthStateChange = jest.fn((callback) => {
        // Don't call callback immediately to simulate loading
        setTimeout(() => callback(null), 100);
        return jest.fn();
      });

      render(<App />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});

