import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

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

/**
 * Resolve the storage key an instance would be acquired under, given an
 * (optional) explicit key and construction args. Callers that both acquire and
 * release (e.g. `@blac/react` `useBloc`) must use this once and pass the same
 * resolved key to both, so the ref is dropped under the key it was taken.
 */
export function resolveInstanceKey<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey: string | undefined,
  args?: ExtractArgs<T>,
): string {
  return getRegistry().resolveKey(BlocClass, instanceKey, args);
}
