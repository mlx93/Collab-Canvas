// Cursor types for multiplayer cursor tracking

export interface Cursor {
  x: number; // Canvas x position
  y: number; // Canvas y position
  userId: string;
  firstName: string; // User's first name
  lastName: string; // User's last name
  colorName: string; // Display name: "Blue", "Red", "Green", etc. (for backwards compatibility)
  cursorColor: string; // Hex code for actual cursor color: "#3B82F6"
  lastUpdate: number; // Timestamp for staleness detection
}

// Removed unused CursorPosition interface
