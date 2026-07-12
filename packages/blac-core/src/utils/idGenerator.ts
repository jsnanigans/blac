/**
 * Centralized ID Generation
 *
 * Provides consistent, collision-resistant ID generation for all BlaC subsystems.
 * Uses timestamp + counter + random suffix for uniqueness.
 */

/**
 * Generate simple ID with timestamp and random (no counter tracking)
 *
 * Format: `${prefix}:${timestamp}_${random}`
 *
 * @param prefix - Prefix for the ID
 * @returns Branded ID string
 *
 * @example
 * ```ts
 * const id = generateSimpleId('CounterBloc');
 * // Returns: "CounterBloc:1698765432100_a3k9d7f2q"
 * ```
 */
export function generateSimpleId(prefix: string, affix?: string): string {
  if (affix) {
    return `${prefix}:${affix}`;
  }
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}:${timestamp}_${random}`;
}
