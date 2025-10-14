// Cursor types for multiplayer cursor tracking

export interface Cursor {
  x: number; // Canvas x position
  y: number; // Canvas y position
  userId: string;
  colorName: string; // Display name: "Blue", "Red", "Green", etc.
  cursorColor: string; // Hex code for actual cursor color: "#3B82F6"
  lastUpdate: number; // Timestamp for staleness detection
}

export interface CursorPosition {
  x: number;
  y: number;
}
