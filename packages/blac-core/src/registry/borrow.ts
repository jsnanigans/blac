import { getRegistry } from './config';
import type { StateContainerConstructor } from '../types/utilities';

export function borrow<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): InstanceType<T> {
  return getRegistry().borrow(BlocClass, instanceKey);
}

export function borrowSafe<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
):
  | { error: Error; instance: null }
  | { error: null; instance: InstanceType<T> } {
  return getRegistry().borrowSafe(BlocClass, instanceKey);
}
