// SelectionIndicator component - Shows when another user has selected a shape (but not editing)
import React from 'react';
import { Text, Rect, Group } from 'react-konva';
import { LiveSelection } from '../../services/liveSelections.service';
import { calculateIndicatorPosition, calculateTextWidth } from '../../utils/indicatorPositioning';

interface SelectionIndicatorProps {
  selection: LiveSelection;
  shapeX: number;
  shapeY: number;
  shapeWidth: number;
  shapeHeight?: number; // Optional height for non-square shapes
  scale: number; // Viewport scale for size adjustment
}

export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  selection,
  shapeX,
  shapeY,
  shapeWidth,
  shapeHeight = shapeWidth,
  scale,
}) => {
  // Use firstName if available, otherwise fall back to email
  const displayName = selection.userName && selection.userName !== 'User' 
    ? selection.userName 
    : selection.userEmail.split('@')[0]; // Use email username part as fallback
  const displayText = `${displayName} has selected`;
  
  // Use shared positioning utility for consistency
  const position = calculateIndicatorPosition(shapeX, shapeY, shapeWidth, shapeHeight, scale);
  const actualWidth = calculateTextWidth(displayText, scale);
  
  // Badge dimensions (adjusted for scale to remain visible)
  const fontSize = 12 / scale;
  const padding = 6 / scale;
  const badgeHeight = fontSize + (padding * 2);
  
  // Use actual text width for precise positioning
  const badgeX = shapeX + (shapeWidth / 2) - (actualWidth / 2);
  const badgeY = position.y;

  return (
    <Group>
      {/* Badge background */}
      <Rect
        x={badgeX}
        y={badgeY}
        width={actualWidth}
        height={badgeHeight}
        fill="#D3D3D3"
        cornerRadius={4 / scale}
        shadowColor="black"
        shadowBlur={4 / scale}
        shadowOpacity={0.3}
        shadowOffsetX={0}
        shadowOffsetY={2 / scale}
        stroke={selection.cursorColor}
        strokeWidth={3 / scale}
      />
      
      {/* Badge text */}
      <Text
        x={badgeX + padding}
        y={badgeY + padding}
        text={displayText}
        fontSize={fontSize}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#333333"
        fontStyle="600"
      />
    </Group>
  );
};
