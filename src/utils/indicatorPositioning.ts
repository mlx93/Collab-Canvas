/**
 * Shared utility for consistent indicator positioning
 * Ensures "Bob has selected" and "Bob is moving" indicators appear in the same location
 * to prevent screen glitching when switching between selection and edit modes
 */

export interface IndicatorPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate consistent indicator position for any shape
 * 
 * @param shapeX - Shape's X position
 * @param shapeY - Shape's Y position  
 * @param shapeWidth - Shape's width
 * @param shapeHeight - Shape's height (optional, defaults to shapeWidth for circles)
 * @param scale - Viewport scale for size adjustment
 * @returns Position and dimensions for the indicator badge
 */
export function calculateIndicatorPosition(
  shapeX: number,
  shapeY: number,
  shapeWidth: number,
  shapeHeight: number = shapeWidth,
  scale: number = 1
): IndicatorPosition {
  // Badge dimensions (adjusted for scale to remain visible)
  const fontSize = 12 / scale;
  const padding = 6 / scale;
  const badgeHeight = fontSize + (padding * 2);
  
  // Estimate text width (rough approximation - will be refined by actual text)
  const estimatedTextWidth = 120; // Conservative estimate for most text lengths
  const badgeWidth = estimatedTextWidth + (padding * 2);
  
  // Position badge above the shape, centered horizontally
  const badgeX = shapeX + (shapeWidth / 2) - (badgeWidth / 2);
  const badgeY = shapeY - badgeHeight - (10 / scale); // 10px gap above shape
  
  return {
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight
  };
}

/**
 * Calculate actual badge width based on text content
 * 
 * @param text - The text to display
 * @param scale - Viewport scale
 * @returns Actual width needed for the text
 */
export function calculateTextWidth(text: string, scale: number = 1): number {
  const fontSize = 12 / scale;
  const padding = 6 / scale;
  const estimatedTextWidth = text.length * (fontSize * 0.6);
  return estimatedTextWidth + (padding * 2);
}
