// Jest setup for testing with Firebase emulators
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key';
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.REACT_APP_FIREBASE_DATABASE_URL = 'http://localhost:9000';
process.env.REACT_APP_FIREBASE_PROJECT_ID = 'test-project';
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.REACT_APP_FIREBASE_APP_ID = '1:123456789:web:abcdef';

// Disable Firebase emulators for tests to avoid Java version issues
process.env.REACT_APP_USE_EMULATORS = 'false';

// Configure Firebase emulators for testing
if (typeof window !== 'undefined') {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Mock Firebase services for testing
jest.mock('./services/firebase', () => ({
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        onSnapshot: jest.fn(),
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn(),
        onSnapshot: jest.fn(),
      })),
    })),
  },
  rtdb: {
    ref: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      onDisconnect: jest.fn(() => ({
        set: jest.fn(),
        remove: jest.fn(),
      })),
    })),
  },
}));
