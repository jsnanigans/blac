import { getRegistry } from './config';
import { resolveInstanceKey } from '../core/resolveInstanceKey';
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
 * @param opts - `args` derives the instance key; `refId` names the reference
 *   for debugging and is auto-generated when omitted.
 */
export function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T>; refId?: string },
): InstanceType<T> {
  const registry = getRegistry();
  const key = resolveInstanceKey(BlocClass, opts?.args);
  return registry.acquire(BlocClass, key, {
    canCreate: true,
    countRef: true,
    refId: opts?.refId,
    args: opts?.args,
  });
}

export { resolveInstanceKey };
