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

  /**
   * Circuit breaker: maximum number of live instances allowed under a single
   * bloc constructor before `acquire` throws. Guards against runaway instance
   * creation — typically an unstable/args-derived key churning out instances
   * that are never disposed (a memory leak that eventually freezes the app).
   *
   * Default: `1000`. Set to `Infinity` (or any non-positive value) to disable.
   */
  maxInstancesPerType: number;

  /**
   * Circuit breaker: maximum number of distinct live references (consumers)
   * allowed on a single instance before `acquire` throws. Guards against the
   * other leak shape — consumer cleanup (e.g. `useBloc` unmount `release`)
   * never firing, so refs accumulate without bound on one instance.
   *
   * Default: `1000`. Set to `Infinity` (or any non-positive value) to disable.
   */
  maxRefsPerInstance: number;

  /**
   * Dev-only soft circuit breaker: if a single instance emits more than this
   * many *real* state changes within a rolling one-second window, log a single
   * `console.warn`. This is the "frozen app" smell — almost always a tight loop
   * (RAF/animation, or an effect that emits on every commit) pushing
   * high-frequency data through bloc state, which then saturates subscribers,
   * plugins (logging/devtools), and the main thread.
   *
   * Heuristic by nature — warns, never throws, since high-frequency state can
   * occasionally be legitimate. No-op in production. Default: `100`. Set to
   * `Infinity` (or any non-positive value) to disable.
   */
  maxEmitsPerSecond: number;
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
  maxInstancesPerType: 1000,
  maxRefsPerInstance: 1000,
  maxEmitsPerSecond: 100,
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
