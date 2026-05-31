import { ALL_PATHS } from '@dirtytalk/structural';
import { getRegistry } from '../registry';
import { resolveInstanceKey } from '../registry/acquire';
import type {
  ExtractArgs,
  StateContainerConstructor,
  StateContainerInstance,
} from '../types/utilities';

const STOP: unique symbol = Symbol('watch.STOP');
type StopSymbol = typeof STOP;

const BLOC_REF_MARKER = Symbol('BlocRef');

/**
 * Reference to a specific bloc instance, identified by class + the resolved
 * key derived from its `args`.
 */
export interface BlocRef<T extends StateContainerConstructor> {
  [BLOC_REF_MARKER]: true;
  blocClass: T;
  /** @internal The resolved instance key (derived from `args`). */
  instanceId: string;
}

/**
 * Create a reference to a specific bloc instance, identified by its `args`.
 * The key is derived the same way `useBloc`/`acquire` derive it.
 *
 * @example
 * ```ts
 * watch(instance(UserBloc, { userId: 'user-123' }), (userBloc) => {
 *   console.log(userBloc.state.name);
 * });
 * ```
 */
export function instance<T extends StateContainerConstructor>(
  BlocClass: T,
  args?: ExtractArgs<T>,
): BlocRef<T> {
  return {
    [BLOC_REF_MARKER]: true,
    blocClass: BlocClass,
    instanceId: resolveInstanceKey(BlocClass, args),
  };
}

function isBlocRef(
  input: unknown,
): input is BlocRef<StateContainerConstructor> {
  return (
    typeof input === 'object' && input !== null && BLOC_REF_MARKER in input
  );
}

type BlocInput = StateContainerConstructor | BlocRef<StateContainerConstructor>;

type ExtractInstance<T> =
  T extends BlocRef<infer C>
    ? InstanceType<C>
    : T extends StateContainerConstructor
      ? InstanceType<T>
      : never;

type ExtractInstances<T extends readonly BlocInput[]> = {
  [K in keyof T]: ExtractInstance<T[K]>;
};

/**
 * Watch function signature for single bloc.
 */
export interface WatchSingleFn {
  <T extends StateContainerConstructor>(
    bloc: T | BlocRef<T>,
    callback: (bloc: InstanceType<T>) => void | StopSymbol,
  ): () => void;

  STOP: StopSymbol;
}

/**
 * Watch function signature for multiple blocs.
 */
export interface WatchMultipleFn {
  <T extends readonly BlocInput[]>(
    blocs: T,
    callback: (blocs: ExtractInstances<T>) => void | StopSymbol,
  ): () => void;

  STOP: StopSymbol;
}

/**
 * Combined watch function type.
 */
export interface WatchFn extends WatchSingleFn {
  <T extends readonly BlocInput[]>(
    blocs: T,
    callback: (blocs: ExtractInstances<T>) => void | StopSymbol,
  ): () => void;
}

function resolveBloc(input: BlocInput): StateContainerInstance {
  const registry = getRegistry();
  if (isBlocRef(input)) {
    return registry.ensure(input.blocClass, input.instanceId);
  }
  return registry.ensure(
    input,
    registry.resolveKey(input, undefined, undefined),
  );
}

function isArray(input: unknown): input is readonly BlocInput[] {
  return Array.isArray(input);
}

/**
 * Watch one or more blocs for state changes.
 *
 * Thin wrapper around `container.channel.subscribe(ALL_PATHS, ...)`. The
 * callback fires once immediately, then on every state change of any of the
 * passed blocs. Returning `watch.STOP` from the callback tears down all
 * subscriptions.
 *
 * Note: subscriptions are microtask-deferred (per the DirtyChannel default
 * scheduler), so callbacks land asynchronously after `emit()`.
 *
 * @example Single bloc
 * ```ts
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   console.log(userBloc.state.name);
 * });
 * ```
 *
 * @example Multiple blocs
 * ```ts
 * const unwatch = watch(
 *   [UserBloc, SettingsBloc] as const,
 *   ([userBloc, settingsBloc]) => {
 *     console.log(userBloc.state.name, settingsBloc.state.theme);
 *   }
 * );
 * ```
 *
 * @example With specific instance
 * ```ts
 * const unwatch = watch(
 *   instance(UserBloc, { userId: 'user-123' }),
 *   (userBloc) => {
 *     console.log(userBloc.state.name);
 *   }
 * );
 * ```
 *
 * @example Stop watching from callback
 * ```ts
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   if (userBloc.state.done) {
 *     return watch.STOP;
 *   }
 * });
 * ```
 */
function watchImpl<T extends StateContainerConstructor>(
  bloc: T | BlocRef<T>,
  callback: (bloc: InstanceType<T>) => void | StopSymbol,
): () => void;

function watchImpl<T extends readonly BlocInput[]>(
  blocs: T,
  callback: (blocs: ExtractInstances<T>) => void | StopSymbol,
): () => void;

function watchImpl(
  blocsOrBloc: BlocInput | readonly BlocInput[],
  callback: (blocsOrBloc: any) => void | StopSymbol,
): () => void {
  const isSingle = !isArray(blocsOrBloc);
  const inputs = isSingle ? [blocsOrBloc] : blocsOrBloc;

  const instances = inputs.map(resolveBloc);

  let disposed = false;
  const subscriptions: (() => void)[] = [];

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    for (const unsub of subscriptions) unsub();
    subscriptions.length = 0;
  };

  const runCallback = () => {
    if (disposed) return;
    const arg = isSingle ? instances[0] : instances;
    const result = callback(arg);
    if (result === STOP) cleanup();
  };

  for (const inst of instances) {
    subscriptions.push(inst.channel.subscribe(() => ALL_PATHS, runCallback));
  }

  // Fire once immediately so the consumer sees the current state.
  runCallback();

  return cleanup;
}

export const watch: WatchFn = Object.assign(watchImpl, { STOP }) as WatchFn;
