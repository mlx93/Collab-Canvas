// EditingIndicator component - Shows when another user is editing a shape
import React from 'react';
import { Text, Rect, Group } from 'react-konva';
import { ActiveEdit } from '../../services/activeEdits.service';
import { calculateIndicatorPosition, calculateTextWidth } from '../../utils/indicatorPositioning';

interface EditingIndicatorProps {
  activeEdit: ActiveEdit;
  rectangleX: number;
  rectangleY: number;
  rectangleWidth: number;
  rectangleHeight?: number; // Optional height for non-square shapes
  scale: number; // Viewport scale for size adjustment
}

export const EditingIndicator: React.FC<EditingIndicatorProps> = ({
  activeEdit,
  rectangleX,
  rectangleY,
  rectangleWidth,
  rectangleHeight = rectangleWidth,
  scale,
}) => {
  // Get action display text
  const getActionText = (action: string): string => {
    switch (action) {
      case 'moving':
        return 'Moving';
      case 'resizing':
        return 'Resizing';
      case 'recoloring':
        return 'Recoloring';
      default:
        return 'Editing';
    }
  };

  const actionText = getActionText(activeEdit.action);
  // Use firstName if available, otherwise fall back to email (for backward compatibility)
  const displayName = activeEdit.firstName && activeEdit.firstName !== 'User' 
    ? activeEdit.firstName 
    : activeEdit.email.split('@')[0]; // Use email username part as fallback
  const displayText = `${displayName} is ${actionText.toLowerCase()}`;
  
  // Use shared positioning utility for consistency
  const position = calculateIndicatorPosition(rectangleX, rectangleY, rectangleWidth, rectangleHeight, scale);
  const actualWidth = calculateTextWidth(displayText, scale);
  
  // Badge dimensions (adjusted for scale to remain visible)
  const fontSize = 12 / scale;
  const padding = 6 / scale;
  const badgeHeight = fontSize + (padding * 2);
  
  // Use actual text width for precise positioning
  const badgeX = rectangleX + (rectangleWidth / 2) - (actualWidth / 2);
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
        stroke={activeEdit.cursorColor}
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
