// Application constants
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;
export const CANVAS_ID = 'default-canvas'; // Hardcoded global canvas ID
export const CANVAS_BACKGROUND = '#FAFAFA'; // Off-white

// Rectangle defaults
export const DEFAULT_RECT_SIZE = 100; // 100x100px default
export const MIN_RECT_SIZE = 1; // Minimum 1px
export const MAX_RECT_SIZE = 4000; // Maximum 80% of canvas (4000px)

// Zoom limits
export const MIN_ZOOM = 0.1; // 10%
export const MAX_ZOOM = 8; // 800%

// Predefined colors (Material Design)
export const PREDEFINED_COLORS = {
  blue: '#2196F3',
  green: '#4CAF50',
  red: '#F44336',
  orange: '#FF9800',
  black: '#212121'
} as const;

export const DEFAULT_COLOR = '#2196F3'; // Material Blue 500

// Performance
export const TARGET_FPS = 60;
export const CURSOR_UPDATE_INTERVAL = 16; // 16ms for 60 FPS

