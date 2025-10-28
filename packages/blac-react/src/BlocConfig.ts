/**
 * BlocConfig - Global configuration for useBloc behavior
 *
 * Allows configuration of default mode for useBloc hook:
 * - 'simple': Uses useState + useEffect (default, better performance)
 * - 'concurrent': Uses useSyncExternalStore (for concurrent features)
 */

/**
 * Mode types for useBloc implementation
 */
export type BlocMode = 'simple' | 'concurrent';

/**
 * Global configuration class for BlaC React integration
 */
export class BlocConfig {
  private static defaultMode: BlocMode = 'simple';

  /**
   * Set the default mode for useBloc hook globally
   * @param mode - 'simple' for useState+useEffect, 'concurrent' for useSyncExternalStore
   */
  static setDefaultMode(mode: BlocMode): void {
    if (mode !== 'simple' && mode !== 'concurrent') {
      throw new Error(
        `Invalid mode: ${mode}. Must be 'simple' or 'concurrent'.`,
      );
    }
    this.defaultMode = mode;
  }

  /**
   * Get the current default mode
   * @returns Current default mode
   */
  static getDefaultMode(): BlocMode {
    return this.defaultMode;
  }

  /**
   * Reset to default configuration
   */
  static reset(): void {
    this.defaultMode = 'simple';
  }
}
