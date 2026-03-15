/**
 * Instance key generation utilities for Preact integration
 */

/**
 * Generate an instance key for a bloc
 *
 * @param providedId - User-provided instance ID (from options)
 * @returns Instance key string or undefined for default
 */
export function generateInstanceKey(
  providedId?: string | number,
): string | undefined {
  if (providedId !== undefined) {
    return typeof providedId === 'number' ? String(providedId) : providedId;
  }
  return undefined;
}
