import { globalRegistry } from '../core/StateContainerRegistry';
import type {
  StateContainerConstructor,
  ExtractProps,
} from '../types/utilities';

export interface AcquireOptions<T extends StateContainerConstructor> {
  props?: ExtractProps<T>;
}

export function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  options?: AcquireOptions<T>,
): InstanceType<T> {
  return globalRegistry.acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: true,
    props: options?.props,
  });
}
