import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

export function ensure<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  args?: ExtractArgs<T>,
): InstanceType<T> {
  return getRegistry().ensure(BlocClass, instanceKey, args);
}
