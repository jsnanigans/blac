/**
 * Global configuration for @blac/react
 */

export interface BlacReactConfig {
  /** Enable automatic property tracking via Proxy (default: true) */
  autoTrack: boolean;
}

const defaultConfig: BlacReactConfig = {
  autoTrack: true,
};

let globalConfig: BlacReactConfig = { ...defaultConfig };

/**
 * Configure global defaults for @blac/react hooks.
 *
 * @example
 * ```ts
 * import { configureBlacReact } from '@blac/react';
 *
 * // Disable auto-tracking globally
 * configureBlacReact({
 *   autoTrack: false
 * });
 * ```
 *
 * @param config - Partial configuration to merge with defaults
 */
export function configureBlacReact(config: Partial<BlacReactConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get the current global configuration.
 * @internal
 */
export function getBlacReactConfig(): BlacReactConfig {
  return globalConfig;
}

/**
 * Reset configuration to defaults (useful for testing).
 * @internal
 */
export function resetBlacReactConfig(): void {
  globalConfig = { ...defaultConfig };
}
