/**
 * Global configuration for @blac/core
 */
export interface BlacConfig {
  /** Enable development mode (enables additional warnings and checks) */
  devMode: boolean;
}

const defaultConfig: BlacConfig = {
  devMode: process.env.NODE_ENV !== 'production',
};

let globalConfig: BlacConfig = { ...defaultConfig };

/**
 * Configure global defaults for @blac/core.
 *
 * @example
 * ```ts
 * import { configureBlac } from '@blac/core';
 *
 * configureBlac({
 *   devMode: true
 * });
 * ```
 *
 * @param config - Partial configuration to merge with defaults
 */
export function configureBlac(config: Partial<BlacConfig>): void {
  globalConfig = {
    ...globalConfig,
    ...config,
  };
}

/**
 * Get the current global configuration.
 * @internal
 */
export function getBlacConfig(): BlacConfig {
  return globalConfig;
}

/**
 * Check if development mode is enabled.
 */
export function isDevMode(): boolean {
  return globalConfig.devMode;
}

/**
 * Reset configuration to defaults (useful for testing).
 * @internal
 */
export function resetBlacConfig(): void {
  globalConfig = { ...defaultConfig };
}
