/**
 * Centralized ID Generation
 *
 * Provides consistent, collision-resistant ID generation for all BlaC subsystems.
 * Uses timestamp + counter + random suffix for uniqueness.
 */

// Global counter map for ID generation
const globalCounters = new Map<string, number>();

/**
 * Creates an ID generator with isolated counter state
 *
 * @param prefix - Prefix for generated IDs
 * @returns Object with next(), nextSimple(), and reset() methods
 *
 * @example
 * ```ts
 * const generator = createIdGenerator('sub');
 * const id1 = generator.next(); // "sub:1698765432100_1_a3k9d7f2q"
 * const id2 = generator.next(); // "sub:1698765432101_2_b4n8e9g3r"
 * ```
 */
export function createIdGenerator(prefix: string) {
  let counter = 0;
  return {
    next: () =>
      `${prefix}:${Date.now()}_${++counter}_${Math.random().toString(36).substring(2, 11)}`,
    nextSimple: () => `${prefix}:${++counter}`,
    reset: () => {
      counter = 0;
    },
  };
}

/**
 * Generate ID with timestamp, counter, and random suffix (tree-shakeable)
 *
 * Format: `${prefix}:${timestamp}_${counter}_${random}`
 *
 * @param prefix - Prefix for the ID (e.g., 'sub', 'consumer', 'stage')
 * @returns Branded ID string
 *
 * @example
 * const id = generateId('sub');
 * // Returns: "sub:1698765432100_1_a3k9d7f2q"
 */
export function generateId(prefix: string): string {
  const counter = (globalCounters.get(prefix) ?? 0) + 1;
  globalCounters.set(prefix, counter);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}:${timestamp}_${counter}_${random}`;
}

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

/**
 * Reset all counters for testing purposes
 * @internal
 */
export function __resetIdCounters(): void {
  globalCounters.clear();
}

/**
 * Generate a unique isolated instance key
 * Uses base36 encoding for compact, URL-safe identifiers
 *
 * Format: "isolated-{9-char-random-string}"
 * Example: "isolated-k7x2m9p4q"
 *
 * @returns A unique isolated instance key
 */
export function generateIsolatedKey(): string {
  const randomPart = Math.random().toString(36).slice(2, 11);
  return `isolated-${randomPart}`;
}

/**
 * Check if a key is an isolated instance key
 * @param key - The instance key to check
 * @returns true if the key is an isolated instance key
 */
export function isIsolatedKey(key: string): boolean {
  return key.startsWith('isolated-');
}
