/**
 * Default configuration constants for BlaC
 *
 * Centralized location for all magic numbers and default values.
 */

/**
 * Static property names for StateContainer classes
 * Used for feature flags and configuration on bloc classes
 */
export const BLAC_STATIC_PROPS = {
  /**
   * Mark a bloc to never be auto-disposed (kept alive permanently)
   */
  KEEP_ALIVE: 'keepAlive',

  /**
   * Exclude a bloc from DevTools reporting (prevents infinite loops)
   */
  EXCLUDE_FROM_DEVTOOLS: '__excludeFromDevTools',

  /**
   * Per-class equality function used to short-circuit `emit`/`patch` when the
   * new state is structurally equal to the previous state. Falls back to the
   * global `configureBlac({ equality })` value when unset.
   */
  EQUALITY: '__equality',

  /**
   * Per-class key function: `static key = (args) => string`.
   * When set, the registry calls `Type.key(args)` to derive the instance key
   * instead of using a structural hash of `args`. Allows blocs to ignore
   * non-identity fields (e.g., `readonly` flags) while still keying by id.
   */
  KEY: 'key',

  /**
   * Explicit, minification-safe identity for a bloc class: `static blacName = '...'`.
   * When unset, identity falls back to `constructor.name`.
   */
  BLAC_NAME: 'blacName',
} as const;

/**
 * Standard error message prefix
 */
export const BLAC_ERROR_PREFIX = '[BlaC]' as const;

/**
 * True only when `process.env.NODE_ENV` is defined and not `'production'`.
 *
 * Dev-only checks (emit-rate breaker, deps collision scan, args-mismatch key)
 * cost real work per emit/acquire, so an environment that says nothing about
 * its mode — plain ESM in the browser, Deno, a bundle without a `process`
 * shim — is treated as production. Bundlers that define `process.env.NODE_ENV`
 * still constant-fold the read.
 */
const nodeEnv: string | undefined = (() => {
  try {
    return process.env.NODE_ENV;
  } catch {
    return undefined;
  }
})();

export const IS_DEV: boolean =
  nodeEnv !== undefined && nodeEnv !== 'production';
