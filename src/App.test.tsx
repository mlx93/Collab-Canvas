import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { authService } from './services/auth.service';

// Mock the auth service
jest.mock('./services/auth.service');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Mock Firebase
jest.mock('./services/firebase', () => ({
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

test('renders CollabCanvas app', async () => {
  // Setup auth mock to simulate no user
  mockedAuthService.onAuthStateChange = jest.fn((callback) => {
    callback(null);
    return jest.fn();
  });

  render(<App />);
  
  // Wait for the app to load and show the login form
  await waitFor(() => {
    expect(screen.getByText(/CollabCanvas/i)).toBeInTheDocument();
  });
});
