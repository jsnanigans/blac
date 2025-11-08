/**
 * Generate consistent color from string
 * Uses HSL for good visibility on dark backgrounds
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color with good saturation and lightness for visibility
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}
