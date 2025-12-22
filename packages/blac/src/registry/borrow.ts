import { globalRegistry } from '../core/StateContainerRegistry';
import type { StateContainerConstructor } from '../types/utilities';

export function borrow<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): InstanceType<T> {
  return globalRegistry.borrow(BlocClass, instanceKey);
}

export function borrowSafe<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
):
  | { error: Error; instance: null }
  | { error: null; instance: InstanceType<T> } {
  return globalRegistry.borrowSafe(BlocClass, instanceKey);
}
