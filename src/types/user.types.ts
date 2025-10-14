// User type definitions
export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

