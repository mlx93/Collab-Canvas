// User type definitions
export interface User {
  userId: string;
  email: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

