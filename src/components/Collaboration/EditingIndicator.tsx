// EditingIndicator component - Shows when another user is editing a shape
import React from 'react';
import { Text, Rect, Group } from 'react-konva';
import { ActiveEdit } from '../../services/activeEdits.service';

interface EditingIndicatorProps {
  activeEdit: ActiveEdit;
  rectangleX: number;
  rectangleY: number;
  rectangleWidth: number;
  scale: number; // Viewport scale for size adjustment
}

export const EditingIndicator: React.FC<EditingIndicatorProps> = ({
  activeEdit,
  rectangleX,
  rectangleY,
  rectangleWidth,
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
  
  // Badge dimensions (adjusted for scale to remain visible)
  const fontSize = 12 / scale;
  const padding = 6 / scale;
  const badgeHeight = fontSize + (padding * 2);
  
  // Estimate text width (rough approximation)
  const estimatedTextWidth = displayText.length * (fontSize * 0.6);
  const badgeWidth = estimatedTextWidth + (padding * 2);
  
  // Position badge above the rectangle, centered
  const badgeX = rectangleX + (rectangleWidth / 2) - (badgeWidth / 2);
  const badgeY = rectangleY - badgeHeight - (10 / scale); // 10px gap

  return (
    <Group>
      {/* Badge background */}
      <Rect
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        fill="#D3D3D3"
        cornerRadius={4 / scale}
        shadowColor="black"
        shadowBlur={4 / scale}
        shadowOpacity={0.3}
        shadowOffsetX={0}
        shadowOffsetY={2 / scale}
        stroke={activeEdit.cursorColor}
        strokeWidth={2 / scale}
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
