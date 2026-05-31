import { getRegistry } from './config';
import type {
  ExtractArgs,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * How to identify the instance to borrow: the same `args` shape `useBloc`
 * accepts, resolved through the class's `static key(args)` so call sites use
 * the *same* shape they pass to `useBloc` instead of hand-deriving the key.
 *
 * `borrowSafe(ChannelBloc, { args: { channelId } })` and
 * `useBloc(ChannelBloc, { args: { channelId } })` therefore always agree.
 */
export type BorrowTarget<T extends StateContainerConstructor> = {
  args?: ExtractArgs<T>;
};

function resolveBorrowKey<T extends StateContainerConstructor>(
  BlocClass: T,
  target: BorrowTarget<T> | undefined,
): string {
  return getRegistry().resolveKey(BlocClass, undefined, target?.args);
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
