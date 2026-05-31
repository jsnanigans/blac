import { getRegistry } from './config';
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
  const key = registry.resolveKey(BlocClass, undefined, opts?.args);
  return registry.ensure(BlocClass, key, opts?.args);
}
