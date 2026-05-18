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
   * Default instance key for shared instances
   */
  DEFAULT_INSTANCE_KEY: 'default',

  /**
   * Maximum getter nesting depth (prevents infinite recursion)
   */
  MAX_GETTER_DEPTH: 10,
} as const;

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
   * Mark a bloc so each `useBloc` call site gets its own per-mount instance.
   * The React adapter auto-keys via `useId()` when this is set.
   */
  ISOLATED: 'isolated',
} as const;

/**
 * ID generation patterns and constants
 */
export const BLAC_ID_PATTERNS = {
  /**
   * Length of generated ID portion (9 characters from base36)
   */
  ID_LENGTH: 9,
} as const;

/**
 * Standard error message prefix
 */
export const BLAC_ERROR_PREFIX = '[BlaC]' as const;
