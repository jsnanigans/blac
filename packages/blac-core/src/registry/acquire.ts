import { getRegistry } from './config';
import type { StateContainerConstructor } from '../types/utilities';

export function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  refId?: string,
): InstanceType<T> {
  return getRegistry().acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: true,
    refId,
  });
}
