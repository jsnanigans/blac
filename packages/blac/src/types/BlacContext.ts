/**
 * Context interface that defines the services BlocBase needs from its environment.
 *
 * This interface breaks the circular dependency between Blac and BlocBase by:
 * - BlocBase depends on this interface (not Blac class)
 * - Blac implements this interface
 * - Creates a one-way dependency: Blac → BlocBase (no cycle)
 *
 * Benefits:
 * - Type-safe contract
 * - Easy to mock for testing
 * - Zero runtime overhead (interface is compile-time only)
 * - Clear documentation of BlocBase's dependencies
 */
export interface BlacContext {
  /**
   * Log informational message.
   * Only logs when Blac.enableLog is true.
   *
   * @param args - Arguments to log
   */
  log(...args: unknown[]): void;

  /**
   * Log error message.
   * Always logs errors.
   *
   * @param message - Error message
   * @param args - Additional error context
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Log warning message.
   * Always logs warnings.
   *
   * @param message - Warning message
   * @param args - Additional warning context
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * System plugin registry for lifecycle notifications.
   * Plugins can observe bloc state changes and disposal.
   */
  plugins: {
    /**
     * Notify system plugins that a bloc's state has changed.
     *
     * @param bloc - The bloc instance
     * @param oldState - Previous state
     * @param newState - New state
     */
    notifyStateChanged(bloc: any, oldState: unknown, newState: unknown): void;

    /**
     * Notify system plugins that a bloc has been disposed.
     *
     * @param bloc - The disposed bloc instance
     */
    notifyBlocDisposed(bloc: any): void;
  };
}
