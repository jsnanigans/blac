/**
 * Utility functions for accessing static properties on StateContainer classes
 */

import { BLAC_STATIC_PROPS } from '../constants';
import type { EqualityFn } from '../config';
import { StateContainerConstructor } from '../types/utilities';

/**
 * Get a static property from a class constructor, walking the prototype
 * chain so subclasses inherit the value unless they define their own.
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
 * Get a static property declared directly on `Type`, ignoring the prototype
 * chain, so subclasses never inherit a base class's value.
 *
 * @param Type - The class constructor
 * @param propName - The property name to access
 * @returns The own property value or `undefined`
 */
export function getOwnStaticProp<
  V,
  T extends StateContainerConstructor = StateContainerConstructor,
>(Type: T, propName: string): V | undefined {
  return Object.hasOwn(Type, propName) ? (Type as any)[propName] : undefined;
}

/**
 * Check if a class is marked as keepAlive.
 * KeepAlive classes are never auto-disposed when ref count reaches 0.
 * Inherited: a subclass keeps a base class's `keepAlive` unless overridden.
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
 * Inherited: a subclass keeps a base class's exclusion unless overridden.
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
 * Get the per-class equality function set via `@blac({ equality })`, if any.
 * Inherited: a subclass keeps a base class's equality fn unless overridden.
 * @param Type - The class constructor to check
 * @returns the equality function or `undefined`
 */
export function getClassEquality<T extends StateContainerConstructor>(
  Type: T,
): EqualityFn | undefined {
  const fn = getStaticProp<EqualityFn>(Type, BLAC_STATIC_PROPS.EQUALITY);
  return typeof fn === 'function' ? fn : undefined;
}

/**
 * Get a class's minification-safe identity name.
 * Own only: a subclass never inherits a base class's explicit `blacName`,
 * since that would collapse two distinct blocs onto one identity.
 * Falls back to `Type.name` (the runtime `constructor.name`) when unset.
 * @param Type - The class constructor to check
 * @returns the explicit `static blacName` or `Type.name`
 */
export function getBlacName<T extends StateContainerConstructor>(
  Type: T,
): string {
  return (
    getOwnStaticProp<string>(Type, BLAC_STATIC_PROPS.BLAC_NAME) ?? Type.name
  );
}

/**
 * Get the per-class key function set via `@blac({ key })` or `static key = …`, if any.
 * Used by the registry to derive a stable instance key from `args`.
 * Own only: a subclass never inherits a base class's `key`, since a
 * different `Args` shape would derive the wrong instance key.
 * @param Type - The class constructor to check
 * @returns the key function or `undefined`
 */
export function getClassKey(
  Type: unknown,
): ((args: any) => string) | undefined {
  const fn = getOwnStaticProp<(args: any) => string>(
    Type as StateContainerConstructor,
    BLAC_STATIC_PROPS.KEY,
  );
  return typeof fn === 'function' ? fn : undefined;
}
