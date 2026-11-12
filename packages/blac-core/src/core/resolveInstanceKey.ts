import { getClassKey } from '../utils/static-props';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';
import { structuralKey } from '../utils/structural-key';

/**
 * The single source of keying: `static key(args)` \> structural hash of
 * `args` \> the default key. Acquire and release must both use it so a ref is
 * dropped under the key it was taken.
 * @public
 */
export function resolveInstanceKey<T extends StateContainerConstructor>(
  BlocClass: T,
  args?: ExtractArgs<T>,
): string {
  const keyFn = getClassKey(BlocClass);
  return keyFn ? keyFn(args) : structuralKey(args);
}
