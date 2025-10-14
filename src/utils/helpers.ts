// Helper utility functions

/**
 * Generate a consistent unique cursor color based on userId
 * Hashes the userId to produce a diverse hex color palette
 * Same userId always gets the same color
 */
export const generateCursorColor = (userId: string): string => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate RGB values from hash
  const r = (hash & 0xFF0000) >> 16;
  const g = (hash & 0x00FF00) >> 8;
  const b = hash & 0x0000FF;

  // Ensure colors are vibrant (not too dark or light)
  const minBrightness = 100;
  const maxBrightness = 200;

  const adjustedR = Math.min(maxBrightness, Math.max(minBrightness, r));
  const adjustedG = Math.min(maxBrightness, Math.max(minBrightness, g));
  const adjustedB = Math.min(maxBrightness, Math.max(minBrightness, b));

  return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
};

/**
 * Get a friendly color name for display (e.g., "Blue", "Red")
 */
export const getColorName = (hexColor: string): string => {
  // This is a simplified version - can be expanded with more color names
  const colorMap: { [key: string]: string } = {
    '#2196F3': 'Blue',
    '#4CAF50': 'Green',
    '#F44336': 'Red',
    '#FF9800': 'Orange',
    '#212121': 'Black'
  };

  return colorMap[hexColor] || 'Custom';
};

/**
 * Generate cursor display label from user names
 * If multiple users have the same first name, add last initial
 * Examples:
 *   - "John" (unique first name)
 *   - "John D." (when there's also a "John S.")
 */
export interface CursorWithName {
  userId: string;
  firstName: string;
  lastName: string;
}

export const generateCursorLabel = (cursor: CursorWithName, allCursors: CursorWithName[]): string => {
  const { firstName, lastName } = cursor;
  
  // Count how many users have the same first name
  const sameFirstNameCount = allCursors.filter(
    c => c.firstName.toLowerCase() === firstName.toLowerCase()
  ).length;

  // If unique first name, just show first name
  if (sameFirstNameCount === 1) {
    return firstName;
  }

  // If multiple users with same first name, add last initial
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
};

