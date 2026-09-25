import { ALL_PATHS } from '@dirtytalk/structural';
import { ON_DISPOSE } from '../core/symbols';
import { getRegistry } from '../registry';
import { resolveInstanceKey } from '../registry/acquire';
import type { StateContainerRegistry } from '../core/StateContainerRegistry';
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

/**
 * Options for `watch`.
 */
export interface WatchOptions {
  /**
   * When `false`, `watch` observes passively: it neither creates a missing
   * instance nor takes a real ownership ref on an existing one. If the
   * instance does not exist yet, the callback simply never fires — `watch`
   * does not poll; call it again once the instance exists.
   *
   * Defaults to `true`.
   */
  create?: boolean;
}

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
    options?: WatchOptions,
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
    options?: WatchOptions,
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
    options?: WatchOptions,
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

function toWatchTarget(
  registry: StateContainerRegistry,
  input: BlocInput,
): WatchTarget {
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
  registry: StateContainerRegistry,
  target: WatchTarget,
  refId: string,
): StateContainerInstance {
  return registry.acquire(target.blocClass, target.key, {
    countRef: true,
    refId,
    args: target.args,
  });
}

/**
 * Passive lookup for `{ create: false }`: never creates the instance and
 * never takes a ref. Returns `undefined` when no instance currently exists.
 */
function resolveBlocPassive(
  registry: StateContainerRegistry,
  target: WatchTarget,
): StateContainerInstance | undefined {
  try {
    return registry.acquire(target.blocClass, target.key, {
      canCreate: false,
      countRef: false,
      args: target.args,
    });
  } catch {
    return undefined;
  }
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
 * subscriptions. Subscriptions are microtask-deferred, so callbacks land
 * asynchronously after `emit()`.
 *
 * By default `watch` creates the instance if it does not exist and holds a
 * real ownership ref until `unwatch`, matching `acquire`. Pass
 * `{ create: false }` to observe passively instead — see `WatchOptions`.
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
  options?: WatchOptions,
): () => void;

function watchImpl<T extends readonly BlocInput[]>(
  blocs: T,
  callback: (blocs: ExtractInstances<T>) => void | StopSymbol,
  options?: WatchOptions,
): () => void;

function watchImpl(
  blocsOrBloc: BlocInput | readonly BlocInput[],
  callback: (blocsOrBloc: any) => void | StopSymbol,
  options?: WatchOptions,
): () => void {
  const isSingle = !isArray(blocsOrBloc);
  const inputs = isSingle ? [blocsOrBloc] : blocsOrBloc;
  const registry = getRegistry();
  const create = options?.create ?? true;

  const targets = inputs.map((input) => toWatchTarget(registry, input));
  const refIds = targets.map(() => `_watch_${watchRefSeq++}`);
  const resolveAt = (index: number) =>
    create
      ? resolveBloc(registry, targets[index], refIds[index])
      : resolveBlocPassive(registry, targets[index]);

  let disposed = false;
  const instances: Array<StateContainerInstance | undefined> = [];
  const channelUnsubs: Array<(() => void) | undefined> = [];
  const disposedUnsubs: Array<(() => void) | undefined> = [];

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    for (const unsub of channelUnsubs) unsub?.();
    for (const unsub of disposedUnsubs) unsub?.();
    channelUnsubs.length = 0;
    disposedUnsubs.length = 0;
    if (create) {
      for (let i = 0; i < instances.length; i++) {
        registry.release(
          targets[i].blocClass,
          targets[i].key,
          false,
          refIds[i],
        );
      }
    }
  };

  const runCallback = () => {
    if (disposed) return;
    if (instances.some((i) => i === undefined)) return;
    const arg = isSingle ? instances[0] : instances;
    const result = callback(arg);
    if (result === STOP) cleanup();
  };

  const subscribeAt = (index: number) => {
    channelUnsubs[index] = instances[index]?.channel.subscribe(
      () => ALL_PATHS,
      runCallback,
    );
  };

  // On external dispose, tear down the stale subscription and re-acquire +
  // resubscribe (microtask-deferred, so it never runs mid-mutation of the
  // registry that triggered the dispose, e.g. `clearAll()`), then notify.
  const resubscribeAt = (index: number) => {
    if (disposed) return;
    instances[index] = resolveAt(index);
    subscribeAt(index);
    subscribeDisposeAt(index);
    runCallback();
  };

  const subscribeDisposeAt = (index: number) => {
    disposedUnsubs[index] = instances[index]?.[ON_DISPOSE](() => {
      channelUnsubs[index]?.();
      channelUnsubs[index] = undefined;
      queueMicrotask(() => resubscribeAt(index));
    });
  };

  try {
    for (let i = 0; i < targets.length; i++) instances.push(resolveAt(i));
    for (let i = 0; i < instances.length; i++) subscribeAt(i);
    for (let i = 0; i < instances.length; i++) subscribeDisposeAt(i);
    // Fire once immediately so the consumer sees the current state.
    runCallback();
  } catch (error) {
    cleanup();
    throw error;
  }

  return cleanup;
}

export const watch: WatchFn = Object.assign(watchImpl, { STOP }) as WatchFn;
