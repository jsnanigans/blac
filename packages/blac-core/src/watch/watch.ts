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
  /**
   * @internal The `args` used to derive `instanceId`. Forwarded to
   * `registry.acquire` so a not-yet-created instance is initialized with
   * these args instead of `undefined`.
   */
  args?: unknown;
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
    args,
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

/**
 * Class + resolved key + args needed to (re-)acquire a specific instance.
 * `watch` keeps this around per input so it can re-acquire the same logical
 * instance if the underlying container is disposed elsewhere.
 */
interface WatchTarget {
  blocClass: StateContainerConstructor;
  key: string;
  args: unknown;
}

function toWatchTarget(input: BlocInput): WatchTarget {
  const registry = getRegistry();
  if (isBlocRef(input)) {
    return {
      blocClass: input.blocClass,
      key: input.instanceId,
      args: input.args,
    };
  }
  return {
    blocClass: input,
    key: registry.resolveKey(input, undefined, undefined),
    args: undefined,
  };
}

let watchRefSeq = 0;

/**
 * Acquire a real ref (countRef: true) for the target, carrying its `args`
 * through so a not-yet-created instance is initialized correctly. The
 * caller is responsible for releasing `refId` in cleanup.
 */
function resolveBloc(
  target: WatchTarget,
  refId: string,
): StateContainerInstance {
  const registry = getRegistry();
  return registry.acquire(target.blocClass, target.key, {
    countRef: true,
    refId,
    args: target.args,
  });
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
  const registry = getRegistry();

  const targets = inputs.map(toWatchTarget);
  const refIds = targets.map(() => `_watch_${watchRefSeq++}`);

  let disposed = false;
  const instances: StateContainerInstance[] = targets.map((target, i) =>
    resolveBloc(target, refIds[i]),
  );
  const channelUnsubs: Array<(() => void) | undefined> = [];
  const disposedUnsubs: Array<() => void> = [];

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    for (const unsub of channelUnsubs) unsub?.();
    for (const unsub of disposedUnsubs) unsub();
    channelUnsubs.length = 0;
    disposedUnsubs.length = 0;
    for (let i = 0; i < targets.length; i++) {
      registry.release(targets[i].blocClass, targets[i].key, false, refIds[i]);
    }
  };

  const runCallback = () => {
    if (disposed) return;
    const arg = isSingle ? instances[0] : instances;
    const result = callback(arg);
    if (result === STOP) cleanup();
  };

  const subscribeAt = (index: number) => {
    channelUnsubs[index] = instances[index].channel.subscribe(
      () => ALL_PATHS,
      runCallback,
    );
  };

  // On external dispose, tear down the stale subscription and re-acquire +
  // resubscribe (microtask-deferred, so it never runs mid-mutation of the
  // registry that triggered the dispose, e.g. `clearAll()`), then notify.
  const resubscribeAt = (index: number) => {
    if (disposed) return;
    instances[index] = resolveBloc(targets[index], refIds[index]);
    subscribeAt(index);
    runCallback();
  };

  for (let i = 0; i < instances.length; i++) {
    subscribeAt(i);
  }

  for (let i = 0; i < instances.length; i++) {
    const index = i;
    disposedUnsubs.push(
      registry.on('disposed', (container) => {
        if (disposed) return;
        if (container !== instances[index]) return;
        channelUnsubs[index]?.();
        channelUnsubs[index] = undefined;
        queueMicrotask(() => resubscribeAt(index));
      }),
    );
  }

  // Fire once immediately so the consumer sees the current state.
  runCallback();

  return cleanup;
}

export const watch: WatchFn = Object.assign(watchImpl, { STOP }) as WatchFn;
