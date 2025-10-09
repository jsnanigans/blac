/**
 * Cross-platform UUID v4 generator that works in all environments including React Native/Hermes
 * Falls back to crypto.randomUUID() when available, otherwise uses Math.random()
 */

/**
 * Generates a UUID v4 string compatible with all JavaScript environments
 * @returns A UUID v4 string in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  // Try to use crypto.randomUUID() if available (Node.js 16+, modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation for React Native/Hermes and older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
