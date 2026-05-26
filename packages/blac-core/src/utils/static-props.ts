/**
 * Utility functions for accessing static properties on StateContainer classes
 */

import { BLAC_STATIC_PROPS } from '../constants';
import type { EqualityFn } from '../config';
import { StateContainerConstructor } from '../types/utilities';

/**
 * Get a static property from a class constructor
 * Type-safe helper that avoids (Type as any) casts
 *
 * @param Type - The class constructor
 * @param propName - The property name to access
 * @param defaultValue - Optional default value if property is undefined
 * @returns The property value or default
 */
export function getStaticProp<
  V,
  T extends StateContainerConstructor = StateContainerConstructor,
>(Type: T, propName: string, defaultValue?: V): V | undefined {
  return (Type as any)[propName] ?? defaultValue;
}

/**
 * Check if a class is marked as keepAlive.
 * KeepAlive classes are never auto-disposed when ref count reaches 0.
 * @param Type - The class constructor to check
 * @returns true if the class has `static keepAlive = true`
 */
export function isKeepAliveClass<T extends StateContainerConstructor>(
  Type: T,
): boolean {
  return getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.KEEP_ALIVE) === true;
}

/**
 * Check if a class should be excluded from DevTools.
 * Used to prevent infinite loops when DevTools tracks itself.
 * @param Type - The class constructor to check
 * @returns true if the class has `static __excludeFromDevTools = true`
 */
export function isExcludedFromDevTools<T extends StateContainerConstructor>(
  Type: T,
): boolean {
  return (
    getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.EXCLUDE_FROM_DEVTOOLS) ===
    true
  );
}

/**
 * Check if a class is marked as isolated.
 * Isolated classes get a fresh, per-mount instance from `useBloc`
 * (auto-keyed via React's `useId()`), instead of sharing the default
 * instance with sibling call sites.
 * @param Type - The class constructor to check
 * @returns true if the class has `static isolated = true`
 */
export function isIsolatedClass<T extends StateContainerConstructor>(
  Type: T,
): boolean {
  return getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.ISOLATED) === true;
}

/**
 * Get the per-class equality function set via `@blac({ equality })`, if any.
 * @param Type - The class constructor to check
 * @returns the equality function or `undefined`
 */
export function getClassEquality<T extends StateContainerConstructor>(
  Type: T,
): EqualityFn | undefined {
  const fn = getStaticProp<EqualityFn>(Type, BLAC_STATIC_PROPS.EQUALITY);
  return typeof fn === 'function' ? fn : undefined;
}
