import { getRegistry } from './config';
import type { ExtractArgs, StateContainerConstructor } from '../types/utilities';

export function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  refId?: string,
  args?: ExtractArgs<T>,
): InstanceType<T> {
  return getRegistry().acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: true,
    refId,
    args,
  });
}
