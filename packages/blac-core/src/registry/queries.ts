import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
  InstanceReadonlyState,
} from '../types/utilities';

/**
 * @public
 */
export function hasInstance<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T> },
): boolean {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.hasInstance(BlocClass, key);
}

/**
 * @public
 */
export function getRefCount<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T> },
): number {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.getRefCount(BlocClass, key);
}

/**
 * @public
 */
export function getRefIds<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T> },
): string[] {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.getRefIds(BlocClass, key);
}

/**
 * @public
 */
export function getAll<T extends StateContainerConstructor>(
  BlocClass: T,
): InstanceReadonlyState<T>[] {
  return getRegistry().getAll(BlocClass);
}

/**
 * @public
 */
export function forEach<T extends StateContainerConstructor>(
  BlocClass: T,
  callback: (instance: InstanceReadonlyState<T>) => void,
): void {
  getRegistry().forEach(BlocClass, callback);
}
