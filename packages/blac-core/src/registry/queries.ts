import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
  InstanceReadonlyState,
} from '../types/utilities';

export function hasInstance<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T> },
): boolean {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.hasInstance(BlocClass, key);
}

export function getRefCount<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T> },
): number {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.getRefCount(BlocClass, key);
}

export function getRefIds<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T> },
): string[] {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.getRefIds(BlocClass, key);
}

export function getAll<T extends StateContainerConstructor>(
  BlocClass: T,
): InstanceReadonlyState<T>[] {
  return getRegistry().getAll(BlocClass);
}

export function forEach<T extends StateContainerConstructor>(
  BlocClass: T,
  callback: (instance: InstanceReadonlyState<T>) => void,
): void {
  getRegistry().forEach(BlocClass, callback);
}
