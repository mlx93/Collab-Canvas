// Canvas Context - Placeholder
// Will be implemented in PR #3
import React from 'react';

export const CanvasContext = React.createContext(null);

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <CanvasContext.Provider value={null}>{children}</CanvasContext.Provider>;
};

