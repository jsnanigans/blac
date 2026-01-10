/**
 * Global configuration for @blac/preact
 */

export interface BlacPreactConfig {
  /** Enable automatic property tracking via Proxy (default: true) */
  autoTrack: boolean;
}

const defaultConfig: BlacPreactConfig = {
  autoTrack: true,
};

let globalConfig: BlacPreactConfig = { ...defaultConfig };

/**
 * Configure global defaults for @blac/preact hooks.
 *
 * @example
 * ```ts
 * import { configureBlacPreact } from '@blac/preact';
 *
 * // Disable auto-tracking globally
 * configureBlacPreact({
 *   autoTrack: false
 * });
 * ```
 *
 * @param config - Partial configuration to merge with defaults
 */
export function configureBlacPreact(config: Partial<BlacPreactConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get the current global configuration.
 * @internal
 */
export function getBlacPreactConfig(): BlacPreactConfig {
  return globalConfig;
}

/**
 * Reset configuration to defaults (useful for testing).
 * @internal
 */
export function resetBlacPreactConfig(): void {
  globalConfig = { ...defaultConfig };
}
