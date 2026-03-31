import { getRegistry } from './config';
import type {
  StateContainerConstructor,
  InstanceReadonlyState,
} from '../types/utilities';

export function hasInstance<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): boolean {
  return getRegistry().hasInstance(BlocClass, instanceKey);
}

export function getRefCount<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): number {
  return getRegistry().getRefCount(BlocClass, instanceKey);
}

export function getRefIds<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): string[] {
  return getRegistry().getRefIds(BlocClass, instanceKey);
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
