/**
 * Default configuration constants for BlaC
 *
 * Centralized location for all magic numbers and default values.
 */

/**
 * Default configuration constants for BlaC
 */
export const BLAC_DEFAULTS = {
  /**
   * Default cleanup interval for subscriptions (30 seconds)
   */
  CLEANUP_INTERVAL_MS: 30_000,

  /**
   * Cleanup interval for weak reference stage (10 seconds)
   */
  WEAKREF_CLEANUP_INTERVAL_MS: 10_000,

  /**
   * Default maximum subscriptions per container
   */
  MAX_SUBSCRIPTIONS: 1_000,

  /**
   * Maximum subscriptions for high-performance mode
   */
  MAX_SUBSCRIPTIONS_HIGH_PERF: 10_000,

  /**
   * Default timeout for pipeline execution (5 seconds)
   */
  PIPELINE_TIMEOUT_MS: 5_000,

  /**
   * Cleanup interval for high-performance mode (5 seconds)
   */
  CLEANUP_INTERVAL_HIGH_PERF_MS: 5_000,

  /**
   * Maximum number of stages in a pipeline
   */
  MAX_PIPELINE_STAGES: 30,
} as const;
