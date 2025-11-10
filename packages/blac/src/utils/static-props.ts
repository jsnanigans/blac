/**
 * Utility functions for accessing static properties on StateContainer classes
 */

import { BLAC_STATIC_PROPS } from '../constants';

/**
 * Get a static property from a class constructor
 * Type-safe helper that avoids (Type as any) casts
 *
 * @param Type - The class constructor
 * @param propName - The property name to access
 * @param defaultValue - Optional default value if property is undefined
 * @returns The property value or default
 */
export function getStaticProp<T>(
  Type: new (...args: any[]) => any,
  propName: string,
  defaultValue?: T,
): T | undefined {
  return (Type as any)[propName] ?? defaultValue;
}

/**
 * Check if a class is marked as isolated
 * Isolated classes create separate instances per component
 */
export function isIsolatedClass(Type: new (...args: any[]) => any): boolean {
  return getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.ISOLATED) === true;
}

/**
 * Check if a class is marked as keepAlive
 * KeepAlive classes are never auto-disposed when ref count reaches 0
 */
export function isKeepAliveClass(Type: new (...args: any[]) => any): boolean {
  return getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.KEEP_ALIVE) === true;
}

/**
 * Check if a class should be excluded from DevTools
 * Used to prevent infinite loops when DevTools tracks itself
 */
export function isExcludedFromDevTools(
  Type: new (...args: any[]) => any,
): boolean {
  return (
    getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.EXCLUDE_FROM_DEVTOOLS) ===
    true
  );
}
