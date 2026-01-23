import { globalRegistry } from '../core/StateContainerRegistry';
import type { StateContainerConstructor } from '../types/utilities';

export function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): InstanceType<T> {
  return globalRegistry.acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: true,
  });
}
