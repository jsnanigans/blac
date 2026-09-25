import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  type ExtractArgs,
  type ExtractState,
  type InstanceState,
  type StateContainer,
  type StateContainerConstructor,
} from '@blac/core';
import {
  ALL_PATHS,
  emptyPathSet,
  trackRender,
  ProxyCache,
  type PathSet,
} from '@dirtytalk/structural';
import { useProvidedArgs } from './BlocProvider';
import { useRegistry } from './RegistryProvider';
import { buildTrackedProxy } from './buildTrackedProxy';
import { DepSession, makeDepWrapper, type DepHandleLike } from './depSession';
import { expandWithAncestors } from './expandWithAncestors';
import type { UseBlocOptions, UseBlocReturn } from './types';

let nextConsumerId = 0;

/**
 * React hook that connects a component to a state container with automatic
 * re-render on state changes.
 *
 * Two tracking modes:
 * - **Auto-tracking** (default): the returned state value is a proxy that
 *   records read paths during render. The component re-renders when any
 *   recorded path changes.
 * - **Manual select**: pass `options.select` to opt out of auto-tracking.
 *   The hook re-renders only when the returned array's elements change
 *   (per-index `Object.is`).
 *
 * Lifecycle:
 * - The bloc is acquired from the registry on mount and released on
 *   unmount. The instance key is derived from `options.args` (own args),
 *   then the surrounding {@link BlocProvider} context args for this bloc,
 *   then the default key (no args).
 * - `options.onMount` fires after the bloc is acquired; `options.onUnmount`
 *   fires *before* the registry releases its ref, so the bloc is still
 *   alive when the callback runs.
 *
 * Per-mount private instance:
 * ```ts
 * const id = useId();
 * const [state, bloc] = useBloc(MyBloc, { args: { _id: id } });
 * ```
 *
 * @typeParam T - The state container constructor type (inferred from BlocClass)
 * @param BlocClass - The state container class to connect to
 * @param options - Configuration options
 * @returns Tuple of `[state, bloc]`
 *
 * @example Basic usage
 * ```ts
 * const [state, bloc] = useBloc(MyBloc);
 * ```
 *
 * @example Manual select
 * ```ts
 * const [state, bloc] = useBloc(MyBloc, {
 *   select: (state) => [state.count],
 * });
 * ```
 *
 * @example Args-based shared instance
 * ```ts
 * const [state, bloc] = useBloc(UserBloc, { args: { userId: 'alice' } });
 * ```
 * @public
 */
export function useBloc<
  T extends StateContainerConstructor = StateContainerConstructor,
>(
  BlocClass: T,
  options?: UseBlocOptions<T>,
): UseBlocReturn<T, ExtractState<T>> {
  type TBloc = InstanceState<T>;

  const registry = useRegistry();

  const consumerRef = useRef<Consumer | null>(null);
  const consumer = (consumerRef.current ??= createConsumer());
  const consumerId = consumer.id;

  consumer.select = options?.select;
  consumer.onMount = options?.onMount;
  consumer.onUnmount = options?.onUnmount;

  consumer.ownArgs = (options as { args?: ExtractArgs<T> } | undefined)?.args;
  consumer.providerArgs = useProvidedArgs(BlocClass);
  const effectiveArgs = resolveEffectiveArgs(consumer) as
    | ExtractArgs<T>
    | undefined;
  const instanceKey = registry.resolveKey(BlocClass, undefined, effectiveArgs);

  // Bumped by the ownership effect when the rendered instance was disposed and
  // recreated before commit (a same-commit owner handoff, or StrictMode's
  // double effect). Rebuilds the memo and the subscription against the live
  // instance, since the tracked proxy can't be retargeted in place.
  const rebindNonce = consumer.rebindNonce;

  const { bloc, trackedBloc } = useMemo<{
    bloc: TBloc;
    trackedBloc: TBloc;
  }>(() => {
    // No ref during render; the ownership effect claims it on commit. The
    // registry sweeps the instance if no commit ever does (SSR, discarded
    // renders).
    const instance = registry.acquire(BlocClass, instanceKey, {
      canCreate: true,
      countRef: false,
      args: effectiveArgs,
      sweepIfUnowned: true,
    }) as TBloc;

    // Dep proxies get `onDepHandle` too, so nested `.track()` calls (A→B→C)
    // record into this consumer's session.
    const onDepHandle = (handle: object): unknown => {
      const cache = (consumer.depWrappers ??= new Map());
      const cached = cache.get(handle);
      if (cached !== undefined) return cached;
      const wrapper = makeDepWrapper(
        handle as DepHandleLike,
        registry,
        consumer.deps,
        consumer.tracked,
        onDepHandle,
      );
      cache.set(handle, wrapper);
      return wrapper;
    };

    const { proxy } = buildTrackedProxy(
      instance as object,
      consumer.tracked,
      onDepHandle,
    );

    return { bloc: instance, trackedBloc: proxy as TBloc };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [BlocClass, instanceKey, rebindNonce, registry]);

  consumer.container = bloc as unknown as StateContainer;

  // Keyed on `BlocClass` as well as the key: classes without args or a
  // `static key` share the default key, so `useBloc(cond ? A : B)` must still
  // re-subscribe on a class swap.
  const subscribe = useMemo(
    () => (onStoreChange: () => void) => {
      consumer.notify = onStoreChange;
      const container = consumer.container;
      const unsubscribe = container.channel.subscribe(
        () => consumer.interest,
        () => {
          if (consumer.isSelectMode) {
            const select = consumer.select;
            if (select) {
              const next = select(
                container.state as ExtractState<T>,
                container as unknown as InstanceState<T>,
              );
              const prev = consumer.selection;
              if (prev !== null && shallowArrayEqual(prev, next)) return;
              consumer.selection = next;
            }
          }
          consumer.bump();
        },
      );
      container.registerConsumerPaths(consumerId, consumer.paths);
      // An emit raised during render is still pending in the channel, so its
      // next flush delivers it to this subscriber.
      return () => {
        consumer.notify = noop;
        unsubscribe();
        container.unregisterConsumer(consumerId);
      };
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [BlocClass, instanceKey, consumerId, rebindNonce, registry],
  );

  useSyncExternalStore(
    subscribe,
    consumer.getSnapshot,
    consumer.getServerSnapshot,
  );

  // Ownership is claimed at commit so acquire and release pair exactly. Not
  // keyed on `rebindNonce`: a rebind must not release and re-acquire the ref.
  useLayoutEffect(() => {
    const live = registry.acquire(BlocClass, instanceKey, {
      canCreate: true,
      countRef: true,
      refId: consumer.primaryRefId,
      args: resolveEffectiveArgs(consumer),
    }) as TBloc;
    consumer.ownedBloc = live;
    consumer.onMount?.(live as InstanceType<T>);
    // The render captured a stale instance; re-render against the live one.
    if (live !== bloc) {
      consumer.rebindNonce++;
      consumer.bump();
    }
    return () => {
      // Before release, so the bloc is still alive in the callback.
      consumer.onUnmount?.((consumer.ownedBloc ?? bloc) as InstanceType<T>);
      registry.release(BlocClass, instanceKey, false, consumer.primaryRefId);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [BlocClass, instanceKey, consumerId, registry]);

  const container = consumer.container;
  const rawState = container.state as ExtractState<T>;
  const select = consumer.select;
  consumer.isSelectMode = select !== undefined;
  let state: ExtractState<T>;
  if (select !== undefined) {
    state = rawState;
    // Recomputed every render: the selector may close over props.
    consumer.selection = select(rawState, bloc as InstanceState<T>);
    consumer.interest = ALL_PATHS;
  } else {
    const tracked = trackRender(
      rawState,
      container.interner,
      (consumer.proxyCache ??= new ProxyCache()),
    );
    state = tracked.value as ExtractState<T>;
    consumer.tracked.current = tracked.value;
    consumer.paths = tracked.paths;
    // Run at commit, so reads that outlive the render (effects, handlers)
    // don't add paths.
    consumer.disarm = tracked.disarm;
    // `tracked.paths` is still empty here and fills during JSX, so paths are
    // registered at commit, not now.
    consumer.deps.begin(container, tracked.paths);
  }

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    // Getters called after commit read live state, not this render's proxy.
    consumer.tracked.current = null;
    const disarm = consumer.disarm;
    if (disarm !== null) {
      consumer.disarm = null;
      disarm();
    }
    const deps = consumer.deps;
    if (consumer.isSelectMode) {
      // A later switch back to auto-track must reconcile in full.
      deps.invalidate();
      return;
    }
    if (deps.isUnchanged()) return;

    const primary = consumer.container;
    primary.registerConsumerPaths(consumerId, consumer.paths);
    consumer.interest = expandWithAncestors(consumer.paths, primary.interner);
    deps.reconcile(registry);
  });

  useEffect(
    () => () => consumer.deps.dispose(registry),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [consumerId, registry],
  );

  return [state, trackedBloc] as UseBlocReturn<T, ExtractState<T>>;
}

const noop = (): void => {};

/**
 * Everything one `useBloc` call keeps between renders.
 *
 * `bump` increments `version` before calling `notify`: uSES requires
 * `getSnapshot()` to reflect the change by the time it is notified.
 */
interface Consumer {
  id: string;
  primaryRefId: string;
  /** Written only by the render memo. */
  container: StateContainer;
  version: number;
  /** `noop` while unsubscribed. */
  notify: () => void;
  bump: () => void;
  getSnapshot: () => number;
  getServerSnapshot: () => number;
  /** Expanded leaf paths, or `ALL_PATHS` in select mode. */
  interest: PathSet;
  paths: PathSet;
  isSelectMode: boolean;
  selection: unknown[] | null;
  deps: DepSession;
  // Typed loosely: `T` is per call site.
  select: ((state: any, bloc: any) => unknown[]) | undefined;
  onMount: ((bloc: any) => void) | undefined;
  onUnmount: ((bloc: any) => void) | undefined;
  ownArgs: unknown;
  providerArgs: unknown;
  /** The render's tracking proxy; `null` outside a tracked render. */
  tracked: { current: unknown };
  disarm: (() => void) | null;
  proxyCache: ProxyCache | null;
  depWrappers: Map<object, unknown> | null;
  rebindNonce: number;
  /** The instance the ownership effect holds a ref on. */
  ownedBloc: unknown;
}

function createConsumer(): Consumer {
  const id = `useBloc-${nextConsumerId++}`;
  const consumer: Consumer = {
    id,
    primaryRefId: `useBloc@${id}`,
    container: null as unknown as StateContainer,
    version: 0,
    notify: noop,
    bump: () => {
      consumer.version++;
      consumer.notify();
    },
    getSnapshot: () => consumer.version,
    getServerSnapshot: () => consumer.version,
    interest: emptyPathSet(),
    paths: emptyPathSet(),
    isSelectMode: false,
    selection: null,
    deps: new DepSession(id, () => consumer.bump()),
    select: undefined,
    onMount: undefined,
    onUnmount: undefined,
    ownArgs: undefined,
    providerArgs: undefined,
    tracked: { current: null },
    disarm: null,
    proxyCache: null,
    depWrappers: null,
    rebindNonce: 0,
    ownedBloc: null,
  };
  return consumer;
}

// Own args win over provider args. Shared by render and the ownership effect,
// which recreates a disposed instance and must not drop its args.
const resolveEffectiveArgs = (consumer: Consumer): unknown =>
  consumer.ownArgs !== undefined ? consumer.ownArgs : consumer.providerArgs;

const shallowArrayEqual = (a: unknown[], b: unknown[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
};
