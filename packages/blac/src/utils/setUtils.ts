/**
 * Utility functions for Set operations
 */

/**
 * Check if two sets are equal (contain the same elements)
 * Uses size check for early exit optimization
 * @param a First set
 * @param b Second set
 * @returns true if sets contain identical elements
 */
export function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  // Quick size check for early exit
  if (a.size !== b.size) return false;

  // Check if all elements in a are in b
  for (const item of a) {
    if (!b.has(item)) return false;
  }

  return true;
}

/**
 * Check if two sets are equal, handling undefined cases
 * @param a First set (may be undefined)
 * @param b Second set (may be undefined)
 * @returns true if both undefined or contain identical elements
 */
export function setsEqualNullable<T>(
  a: Set<T> | undefined,
  b: Set<T> | undefined,
): boolean {
  // Both undefined/null
  if (!a && !b) return true;

  // One is undefined, other is not
  if (!a || !b) return false;

  return setsEqual(a, b);
}
