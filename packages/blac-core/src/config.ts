/**
 * Global configuration for `@blac/core`
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

  // `for...in` visits enumerable keys without allocating key arrays; state
  // objects are plain, so own and enumerable coincide.
  const p = prev as Record<string, unknown>;
  const n = next as Record<string, unknown>;
  let prevCount = 0;
  for (const key in p) {
    prevCount++;
    if (!Object.is(p[key], n[key])) return false;
  }
  let nextCount = 0;
  for (const _ in n) nextCount++;
  return prevCount === nextCount;
};

const defaultConfig: BlacConfig = {
  equality: shallowEqualState,
  maxInstancesPerType: 100000,
  maxRefsPerInstance: 100000,
  maxEmitsPerSecond: 1000,
};

let globalConfig: BlacConfig = { ...defaultConfig };

/**
 * Configure global defaults for `@blac/core`.
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
