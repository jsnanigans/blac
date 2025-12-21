/**
 * Utility functions for accessing static properties on StateContainer classes
 */

import { BLAC_STATIC_PROPS } from '../constants';
import { STATELESS_MARKER } from '../core/markers';
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
 * Check if a class is marked as isolated.
 * Isolated classes create separate instances per component.
 * @param Type - The class constructor to check
 * @returns true if the class has `static isolated = true`
 */
export function isIsolatedClass<T extends StateContainerConstructor>(
  Type: T,
): boolean {
  return getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.ISOLATED) === true;
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
 * Check if a class is a stateless container (StatelessCubit or StatelessVertex).
 * Stateless containers don't have state, emit, update, or subscribe methods.
 * @param Type - The class constructor to check
 * @returns true if the class is a stateless container
 */
export function isStatelessClass<T extends StateContainerConstructor>(
  Type: T,
): boolean {
  return (Type as any)[STATELESS_MARKER] === true;
}
