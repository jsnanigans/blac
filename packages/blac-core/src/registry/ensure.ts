import { getRegistry } from './config';
import { resolveInstanceKey } from '../core/resolveInstanceKey';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * Ensure an instance exists without taking ownership (no ref added). Instance
 * identity is derived purely from `args`, matching `acquire`.
 */
export function ensure<T extends StateContainerConstructor>(
  BlocClass: T,
  opts?: { args?: ExtractArgs<T> },
): InstanceType<T> {
  const registry = getRegistry();
  const key = resolveInstanceKey(BlocClass, opts?.args);
  return registry.ensure(BlocClass, key, opts?.args);
}
