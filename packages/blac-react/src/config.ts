/**
 * Global configuration for `@blac/react`.
 *
 * The hook's tracking model is fixed: when `useBloc` is called without a
 * `select`, render-time auto-tracking is used (via
 * `@dirtytalk/structural`'s `trackRender`). When `select` is provided,
 * re-renders are driven by per-index `Object.is` over the returned array.
 *
 * Reserved for forwards-compatible knobs; currently empty.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlacReactConfig {}

const defaultConfig: BlacReactConfig = {};

let globalConfig: BlacReactConfig = { ...defaultConfig };

/**
 * Configure global defaults for `@blac/react` hooks.
 *
 * @param config - Partial configuration to merge with current globals
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
