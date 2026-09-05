import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * Release a reference to an instance. Instance identity is derived purely from
 * `args` (must match the `args` it was acquired with).
 *
 * @param opts - `args` derives the instance key (must match acquire);
 *   `refId` picks the ref to drop, otherwise one arbitrary ref goes;
 *   `forceDispose` disposes immediately regardless of remaining refs.
 */
export function release<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T>; refId?: string; forceDispose?: boolean },
): void {
  const registry = getRegistry();
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  registry.release(BlocClass, key, opts?.forceDispose ?? false, opts?.refId);
}
