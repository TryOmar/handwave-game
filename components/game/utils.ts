// Linear interpolation function
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

// Get player opacity based on health
export const getPlayerOpacity = (health: number): number => {
  switch (health) {
    case 3:
      return 1
    case 2:
      return 0.66
    case 1:
      return 0.33
    default:
      return 1
  }
} 