import { globalRegistry } from '../core/StateContainerRegistry';
import type { StateContainerConstructor } from '../types/utilities';

export function ensure<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): InstanceType<T> {
  return globalRegistry.ensure(BlocClass, instanceKey);
}
