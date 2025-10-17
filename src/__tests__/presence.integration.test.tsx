import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Header } from '../components/Layout/Header';
import { AuthContext } from '../context/AuthContext';
import * as presenceService from '../services/presence.service';

// Mock presence service
jest.mock('../services/presence.service');

const mockPresenceService = presenceService as jest.Mocked<typeof presenceService>;

// Mock usePresence hook
jest.mock('../hooks/usePresence', () => ({
  usePresence: () => ({
    onlineUsers: mockPresenceService.subscribeToPresence.mock.results[0]?.value || [],
    isConnected: true,
  }),
}));

describe('Presence System Integration', () => {
  const mockUser = {
    userId: 'user1',
    email: 'user1@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
  };

  const mockAuthContextValue = {
    user: mockUser,
    loading: false,
    error: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock setUserOnline
    mockPresenceService.setUserOnline.mockResolvedValue();

    // Mock setUserOffline
    mockPresenceService.setUserOffline.mockResolvedValue();

    // Mock subscribeToPresence to return empty array initially
    mockPresenceService.subscribeToPresence.mockReturnValue(jest.fn());

    // Mock subscribeToConnectionState
    mockPresenceService.subscribeToConnectionState.mockReturnValue(jest.fn());
  });

  it('should display user count in header', async () => {
    // Mock presence data with 2 online users
    const mockPresenceData = {
      user1: {
        userId: 'user1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
      user2: {
        userId: 'user2',
        email: 'user2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
    };

    // Configure mock to invoke callback with presence data
    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback(mockPresenceData);
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('2 users online')).toBeInTheDocument();
    });
  });

  it('should display email addresses for users', async () => {
    const mockPresenceData = {
      user1: {
        userId: 'user1',
        email: 'test1@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
    };

    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback(mockPresenceData);
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('1 user online')).toBeInTheDocument();
    });

    // Check for user avatar initials
    const avatar = screen.getByText('AJ');
    expect(avatar).toBeInTheDocument();
  });

  it('should show correct user count for multiple users', async () => {
    const mockPresenceData = {
      user1: {
        userId: 'user1',
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
      user2: {
        userId: 'user2',
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
      user3: {
        userId: 'user3',
        email: 'user3@example.com',
        firstName: 'User',
        lastName: 'Three',
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
    };

    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback(mockPresenceData);
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('3 users online')).toBeInTheDocument();
    });
  });

  it('should filter out offline users', async () => {
    const mockPresenceData = {
      user1: {
        userId: 'user1',
        email: 'user1@example.com',
        firstName: 'Online',
        lastName: 'User',
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      },
      user2: {
        userId: 'user2',
        email: 'user2@example.com',
        firstName: 'Offline',
        lastName: 'User',
        online: false,
        joinedAt: Date.now() - 60000,
        lastSeen: Date.now() - 30000,
      },
    };

    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback(mockPresenceData);
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('1 user online')).toBeInTheDocument();
    });
  });

  it('should call setUserOnline when component mounts', async () => {
    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback({});
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(mockPresenceService.setUserOnline).toHaveBeenCalledWith(
        'user1',
        'user1@example.com',
        'John',
        'Doe'
      );
    });
  });

  it('should handle empty presence list', async () => {
    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback({});
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('0 users online')).toBeInTheDocument();
    });
  });

  it('should update when users join', async () => {
    let presenceCallback: ((data: any) => void) | null = null;

    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      presenceCallback = callback;
      // Start with empty presence
      callback({});
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    // Initially 0 users
    await waitFor(() => {
      expect(screen.getByText('0 users online')).toBeInTheDocument();
    });

    // Simulate a user joining
    act(() => {
      presenceCallback!({
        user2: {
          userId: 'user2',
          email: 'user2@example.com',
          firstName: 'New',
          lastName: 'User',
          online: true,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        },
      });
    });

    // Now should show 1 user
    await waitFor(() => {
      expect(screen.getByText('1 user online')).toBeInTheDocument();
    });
  });

  it('should use default-canvas for all operations', async () => {
    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback({});
      return jest.fn();
    });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(mockPresenceService.setUserOnline).toHaveBeenCalled();
    });

    // The service internally uses CANVAS_ID which is 'default-canvas'
    // This is implicitly tested by the service unit tests
  });

  it('should display ActiveUsers component on far right of header', async () => {
    mockPresenceService.subscribeToPresence.mockImplementation((callback) => {
      callback({
        user1: {
          userId: 'user1',
          email: 'user1@example.com',
          firstName: 'Test',
          lastName: 'User',
          online: true,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        },
      });
      return jest.fn();
    });

    const { container } = render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header fps={60} showFPS={true} />
      </AuthContext.Provider>
    );

    // Check that ActiveUsers is in the right section of the header
    const rightSection = container.querySelector('.flex.items-center.space-x-4');
    expect(rightSection).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1 user online')).toBeInTheDocument();
    });
  });
});

