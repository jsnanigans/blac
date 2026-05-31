import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * Acquire an instance with ref tracking (ownership semantics). Instance
 * identity is derived purely from `args` (via the class's `static key(args)`,
 * a structural hash of `args`, or the default sentinel when there are none).
 *
 * @param BlocClass - The StateContainer class constructor
 * @param opts.args - Construction/identity args; derives the instance key
 * @param opts.refId - Named reference ID for debugging; auto-generated if omitted
 */
export function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T>; refId?: string },
): InstanceType<T> {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.acquire(BlocClass, key, {
    canCreate: true,
    countRef: true,
    refId: opts?.refId,
    args: opts?.args,
  });
}

/**
 * Resolve the storage key an instance would be acquired under, given its
 * construction `args`. This is the canonical key-computation path. Callers that
 * both acquire and release against the `@internal` registry tier (e.g.
 * `@blac/react` `useBloc`) must use this once and pass the same resolved key to
 * both, so the ref is dropped under the key it was taken.
 */
export function resolveInstanceKey<T extends StateContainerConstructor>(
  BlocClass: T,
  args?: ExtractArgs<T>,
): string {
  return getRegistry().resolveKey(BlocClass, undefined, args);
}
