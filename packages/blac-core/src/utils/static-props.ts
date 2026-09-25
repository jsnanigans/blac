import { BLAC_STATIC_PROPS } from '../constants';
import type { EqualityFn } from '../config';
import { StateContainerConstructor } from '../types/utilities';

/**
 * Get a static property from a class constructor, walking the prototype
 * chain so subclasses inherit the value unless they define their own.
 */
export function getStaticProp<
  V,
  T extends StateContainerConstructor = StateContainerConstructor,
>(Type: T, propName: string): V | undefined {
  return (Type as any)[propName];
}

/**
 * Get a static property declared directly on `Type`, ignoring the prototype
 * chain, so subclasses never inherit a base class's value.
 */
export function getOwnStaticProp<
  V,
  T extends StateContainerConstructor = StateContainerConstructor,
>(Type: T, propName: string): V | undefined {
  return Object.hasOwn(Type, propName) ? (Type as any)[propName] : undefined;
}

/**
 * Whether a class is marked `keepAlive` (never auto-disposed at ref count 0).
 * Inherited: a subclass keeps a base class's `keepAlive` unless overridden.
 */
export function isKeepAliveClass<T extends StateContainerConstructor>(
  Type: T,
): boolean {
  return getStaticProp<boolean>(Type, BLAC_STATIC_PROPS.KEEP_ALIVE) === true;
}

/**
 * Whether a class is excluded from DevTools (avoids DevTools tracking itself
 * into an infinite loop). Inherited unless overridden by a subclass.
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
 */
export function getClassEquality<T extends StateContainerConstructor>(
  Type: T,
): EqualityFn | undefined {
  const fn = getStaticProp<EqualityFn>(Type, BLAC_STATIC_PROPS.EQUALITY);
  return typeof fn === 'function' ? fn : undefined;
}

/**
 * Get a class's minification-safe identity name (`static blacName`), falling
 * back to `Type.name`. Own only: a subclass never inherits a base class's
 * explicit `blacName`, since that would collapse two distinct blocs onto one
 * identity.
 */
export function getBlacName<T extends StateContainerConstructor>(
  Type: T,
): string {
  return (
    getOwnStaticProp<string>(Type, BLAC_STATIC_PROPS.BLAC_NAME) ?? Type.name
  );
}

/**
 * Get the per-class key function set via `@blac({ key })` or `static key = …`.
 * Own only: a subclass never inherits a base class's `key`, since a
 * different `Args` shape would derive the wrong instance key.
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
