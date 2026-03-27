import { getRegistry } from './config';
import type { StateContainerConstructor } from '../types/utilities';

export function ensure<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): InstanceType<T> {
  return getRegistry().ensure(BlocClass, instanceKey);
}
