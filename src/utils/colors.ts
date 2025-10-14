// Color utilities
import { PREDEFINED_COLORS } from './constants';

export const getColorOptions = () => {
  return Object.entries(PREDEFINED_COLORS).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));
};

export const isValidColor = (color: string): boolean => {
  return Object.values(PREDEFINED_COLORS).includes(color as any);
};

