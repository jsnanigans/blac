import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * Release a reference to an instance. Instance identity is derived purely from
 * `args` (must match the `args` it was acquired with).
 *
 * @param opts.args - Construction/identity args; derives the instance key
 * @param opts.refId - The specific ref to drop; drops one arbitrary ref if omitted
 * @param opts.forceDispose - Force immediate disposal regardless of refs
 */
export function release<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T>; refId?: string; forceDispose?: boolean },
): void {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  registry.release(BlocClass, key, opts?.forceDispose ?? false, opts?.refId);
}
