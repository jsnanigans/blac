/**
 * Centralized ID Generation
 *
 * Provides consistent, collision-resistant ID generation for all BlaC subsystems.
 * Uses timestamp + counter + random suffix for uniqueness.
 */

/**
 * Centralized ID generator with collision prevention
 */
export class IdGenerator {
  private static counters = new Map<string, number>();

  /**
   * Generate a unique branded ID with prefix, timestamp, counter, and random suffix
   *
   * Format: `${prefix}_${timestamp}_${counter}_${random}`
   *
   * @param prefix - Prefix for the ID (e.g., 'sub', 'consumer', 'stage')
   * @returns Branded ID string
   *
   * @example
   * ```ts
   * const id = IdGenerator.generate<SubscriptionId>('sub');
   * // Returns: "sub_1698765432100_1_a3k9d7f2q"
   * ```
   */
  static generate<T extends string>(prefix: string): T {
    const timestamp = Date.now();
    const counter = this.getAndIncrementCounter(prefix);
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${counter}_${random}` as T;
  }

  /**
   * Generate simple ID without counter (for backwards compatibility)
   *
   * Format: `${prefix}_${timestamp}_${random}`
   *
   * @param prefix - Prefix for the ID
   * @returns Branded ID string
   *
   * @example
   * ```ts
   * const id = IdGenerator.generateSimple<InstanceId>('CounterBloc');
   * // Returns: "CounterBloc_1698765432100_a3k9d7f2q"
   * ```
   */
  static generateSimple<T extends string>(prefix: string): T {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${random}` as T;
  }

  /**
   * Get and increment counter for a given prefix
   */
  private static getAndIncrementCounter(prefix: string): number {
    const current = this.counters.get(prefix) ?? 0;
    const next = current + 1;
    this.counters.set(prefix, next);
    return next;
  }

  /**
   * Reset counter for testing purposes
   * @internal
   */
  static __resetCounters(): void {
    this.counters.clear();
  }
}
