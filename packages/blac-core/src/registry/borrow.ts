import { getRegistry } from './config';
import { resolveInstanceKey } from './acquire';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * How to identify the instance to borrow. Either:
 * - a resolved instance key string (the historical form), or
 * - the same identity shape `useBloc` accepts (`{ instanceId?, args? }`),
 *   resolved through the class's `static key(args)` so call sites can use the
 *   *same* shape they pass to `useBloc` instead of hand-deriving the key.
 *
 * `borrowSafe(ChannelBloc, { args: { channelId } })` and
 * `useBloc(ChannelBloc, { args: { channelId } })` therefore always agree.
 */
export type BorrowTarget<T extends StateContainerConstructor> =
  | string
  | { instanceId?: string; args?: ExtractArgs<T> };

function resolveBorrowKey<T extends StateContainerConstructor>(
  BlocClass: T,
  target: BorrowTarget<T> | undefined,
): string | undefined {
  // String (explicit key) or undefined (default instance) — pass through
  // unchanged so existing callers behave exactly as before.
  if (target === undefined || typeof target === 'string') {
    return target;
  }
  // Object form: derive the key the same way `useBloc` does, so `static key`
  // is the single source of truth for both acquire and borrow.
  return resolveInstanceKey(BlocClass, target.instanceId, target.args);
}

export function borrow<T extends StateContainerConstructor>(
  BlocClass: T,
  target?: BorrowTarget<T>,
): InstanceType<T> {
  return getRegistry().borrow(BlocClass, resolveBorrowKey(BlocClass, target));
}

export function borrowSafe<T extends StateContainerConstructor>(
  BlocClass: T,
  target?: BorrowTarget<T>,
):
  | { error: Error; instance: null }
  | { error: null; instance: InstanceType<T> } {
  return getRegistry().borrowSafe(
    BlocClass,
    resolveBorrowKey(BlocClass, target),
  );
}
