/**
 * Marker symbols for identifying container types.
 * These are in a separate file to avoid circular dependencies.
 * @internal
 */

/**
 * Marker symbol to identify stateless containers at the type level.
 * Used by React hooks to prevent `useBloc` from accepting stateless containers.
 */
export const STATELESS_MARKER = Symbol('STATELESS_CONTAINER');
