// Authentication Context - Placeholder
// Will be implemented in PR #2
import React from 'react';

export const AuthContext = React.createContext(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
};

