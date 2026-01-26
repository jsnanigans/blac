import { globalRegistry } from '../core/StateContainerRegistry';
import type {
  StateContainerConstructor,
  InstanceReadonlyState,
} from '../types/utilities';

export function hasInstance<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): boolean {
  return globalRegistry.hasInstance(BlocClass, instanceKey);
}

export function getRefCount<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): number {
  return globalRegistry.getRefCount(BlocClass, instanceKey);
}

export function getAll<T extends StateContainerConstructor>(
  BlocClass: T,
): InstanceReadonlyState<T>[] {
  return globalRegistry.getAll(BlocClass);
}

export function forEach<T extends StateContainerConstructor>(
  BlocClass: T,
  callback: (instance: InstanceReadonlyState<T>) => void,
): void {
  globalRegistry.forEach(BlocClass, callback);
}
