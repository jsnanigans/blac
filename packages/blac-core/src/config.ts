/**
 * Global configuration for @blac/core
 */

export type EqualityFn = <S>(prev: S, next: S) => boolean;

export interface BlacConfig {
  /**
   * Equality check used by `StateContainer.applyState` to skip emits when
   * `prev` and `next` are structurally equal. Default: `shallowEqualState`.
   *
   * Return `true` to skip the emit (states considered equal).
   */
  equality: EqualityFn;
}

/**
 * Default equality: shallow per-key `Object.is` comparison.
 * Falls through to `false` for primitives/null so reference-only state still
 * behaves correctly.
 */
export const shallowEqualState: EqualityFn = (prev, next) => {
  if (Object.is(prev, next)) return true;
  if (typeof prev !== 'object' || prev === null) return false;
  if (typeof next !== 'object' || next === null) return false;

  const prevKeys = Object.keys(prev as object);
  if (prevKeys.length !== Object.keys(next as object).length) return false;

  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i];
    if (
      !Object.is(
        (prev as Record<string, unknown>)[key],
        (next as Record<string, unknown>)[key],
      )
    ) {
      return false;
    }
  }
  return true;
};

const defaultConfig: BlacConfig = {
  equality: shallowEqualState,
};

let globalConfig: BlacConfig = { ...defaultConfig };

/**
 * Configure global defaults for @blac/core.
 *
 * @example
 * ```ts
 * import { configureBlac, shallowEqualState } from '@blac/core';
 *
 * // Swap in a deep-equality check for all blocs
 * configureBlac({ equality: myDeepEqual });
 * ```
 */
export function configureBlac(config: Partial<BlacConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get the current global configuration.
 * @internal
 */
export function getBlacConfig(): BlacConfig {
  return globalConfig;
}

/**
 * Reset configuration to defaults (useful for testing).
 * @internal
 */
export function resetBlacConfig(): void {
  globalConfig = { ...defaultConfig };
}
