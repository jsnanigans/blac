import { configureLogger, LogLevel, type LogConfig } from './logging/Logger';

/**
 * Global configuration for @blac/core
 */
export interface BlacConfig {
  /** Enable development mode (enables additional warnings and checks) */
  devMode: boolean;
  /** Logger configuration */
  logger: Partial<LogConfig>;
}

const defaultConfig: BlacConfig = {
  devMode: process.env.NODE_ENV !== 'production',
  logger: {
    enabled: false,
    level: LogLevel.INFO,
  },
};

let globalConfig: BlacConfig = { ...defaultConfig };

/**
 * Configure global defaults for @blac/core.
 *
 * @example
 * ```ts
 * import { configureBlac, LogLevel } from '@blac/core';
 *
 * configureBlac({
 *   devMode: true,
 *   logger: {
 *     enabled: true,
 *     level: LogLevel.DEBUG
 *   }
 * });
 * ```
 *
 * @param config - Partial configuration to merge with defaults
 */
export function configureBlac(config: Partial<BlacConfig>): void {
  globalConfig = {
    ...globalConfig,
    ...config,
    logger: {
      ...globalConfig.logger,
      ...config.logger,
    },
  };

  // Apply logger configuration
  if (config.logger) {
    configureLogger(config.logger);
  }
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
  configureLogger(defaultConfig.logger);
}
