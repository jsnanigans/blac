import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import {
  isIsolatedClass,
  resolveInstanceKey,
  type ExtractArgs,
  type ExtractState,
  type InstanceState,
  type StateContainer,
  type StateContainerConstructor,
  type StateContainerRegistry,
} from '@blac/core';
import {
  ALL_PATHS,
  emptyPathSet,
  trackRender,
  ProxyCache,
  type Consumer as PathConsumer,
  type PathSet,
} from '@dirtytalk/structural';
import { ON_DISPOSE } from '@blac/core/internal';
import { useProvidedArgs } from './BlocProvider';
import { useRegistry } from './RegistryProvider';
import { buildTrackedProxy } from './buildTrackedProxy';
import { deferRelease } from './deferRelease';
import { DepSession, makeDepWrapper, type DepHandleLike } from './depSession';
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
 * - The bloc is acquired from the registry on mount and released at the end
 *   of the tick in which the component unmounts, so a consumer mounting in
 *   the same commit takes over the instance instead of getting a new one.
 *   The instance key is derived from `options.args` (own args), then the
 *   surrounding {@link BlocProvider} context args for this bloc, then the
 *   default key (no args).
 * - If the bloc is disposed from outside while mounted (`clear`,
 *   `clearWhere`, ...), the component re-renders against a new instance.
 * - `options.onMount` fires after the bloc is acquired; `options.onUnmount`
 *   fires *before* the registry releases its ref, so the bloc is still
 *   alive when the callback runs.
 *
 * Per-mount private instance: mark the class `@blac({ isolated: true })`, or
 * pass a unique key arg yourself (e.g. `useId()` in `args`). A per-mount
 * instance does not survive a first render that suspends: React discards that
 * render's hook state, so the retry gets a new instance. Do not `use()` a
 * promise owned by a per-mount bloc in the component that creates it.
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
  const registry = useRegistry();
  const consumerRef = useRef<Consumer | null>(null);
  const consumer = (consumerRef.current ??= createConsumer());

  consumer.select = options?.select;
  consumer.onMount = options?.onMount;
  consumer.onUnmount = options?.onUnmount;

  consumer.ownArgs = (options as { args?: ExtractArgs<T> } | undefined)?.args;
  consumer.providerArgs = useProvidedArgs(BlocClass);
  const effectiveArgs = resolveEffectiveArgs(consumer);
  const sharedKey = resolveInstanceKey(
    BlocClass,
    effectiveArgs as ExtractArgs<T>,
  );
  const instanceKey = isIsolatedClass(BlocClass)
    ? `${sharedKey}#${consumer.id}`
    : sharedKey;

  // A memo kept on the consumer rather than in `useMemo`: no hook, deps array
  // or factory closure per mount. `rebindNonce` is bumped when the bound
  // instance is disposed from outside, or was replaced between render and
  // commit; the tracked proxy can't be retargeted in place. Keyed on
  // `BlocClass` as well as the key: classes without args or a `static key`
  // share the default key, so `useBloc(cond ? A : B)` must still re-subscribe
  // on a class swap.
  if (
    consumer.BlocClass !== BlocClass ||
    consumer.instanceKey !== instanceKey ||
    consumer.registry !== registry ||
    consumer.boundNonce !== consumer.rebindNonce
  ) {
    bind(consumer, BlocClass, instanceKey, registry, effectiveArgs);
  }

  useSyncExternalStore(
    consumer.subscribe,
    consumer.getSnapshot,
    consumer.getSnapshot,
  );

  const container = consumer.container;
  const rawState = container.state as ExtractState<T>;
  consumer.renderedState = rawState;
  const select = consumer.select;
  consumer.isSelectMode = select !== undefined;
  let state: ExtractState<T>;
  if (select !== undefined) {
    state = rawState;
    // Recomputed every render: the selector may close over props.
    consumer.selection = select(rawState, container as InstanceState<T>);
    setInterest(consumer, ALL_PATHS);
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

  // Stable callbacks that read this render's inputs from the consumer.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(consumer.commit);
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(consumer.mount, NO_DEPS);

  return [state, consumer.trackedBloc] as UseBlocReturn<T, ExtractState<T>>;
}

const noop = (): void => {};

// Initial `interest` and `paths`; neither is ever mutated in place.
const NO_PATHS: PathSet = emptyPathSet();
const NO_DEPS: [] = [];

/**
 * Everything one `useBloc` call keeps between renders. Its callbacks are
 * created once, so a render allocates no closures.
 *
 * `bump` increments `version` before calling `notify`: uSES requires
 * `getSnapshot()` to reflect the change by the time it is notified.
 *
 * The container subscription is made by the commit (a layout effect), not by
 * uSES's `subscribe` (a passive effect that can run a task later): a change
 * raised in between still bumps `version`, which uSES compares when it
 * subscribes.
 */
interface Consumer {
  id: string;
  primaryRefId: string;
  // The render's inputs, read by the commit of that render.
  BlocClass: StateContainerConstructor;
  instanceKey: string;
  registry: StateContainerRegistry;
  /** Written only by `bind`. */
  container: StateContainer;
  trackedBloc: unknown;
  subscribe: (onStoreChange: () => void) => () => void;
  boundNonce: number;
  rebindNonce: number;
  renderedState: unknown;
  version: number;
  /** `noop` until uSES subscribes. */
  notify: () => void;
  unlisten: () => void;
  bump: () => void;
  getSnapshot: () => number;
  onChange: () => void;
  onDisposed: () => void;
  offDispose: (() => void) | null;
  commit: () => void;
  mount: () => () => void;
  /** The committed `paths`, or `ALL_PATHS` in select mode. */
  interest: PathSet;
  /** `null` until the first commit and after unmount. */
  subscription: PathConsumer | null;
  subscribedTo: StateContainer | null;
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
  // The instance the consumer holds a ref on, claimed at commit so acquire
  // and release pair exactly.
  ownedClass: StateContainerConstructor | null;
  ownedKey: string;
  ownedRegistry: StateContainerRegistry | null;
  ownedBloc: StateContainer | null;
}

function createConsumer(): Consumer {
  const id = `useBloc-${nextConsumerId++}`;
  const consumer: Consumer = {
    id,
    primaryRefId: `useBloc@${id}`,
    BlocClass: null as unknown as StateContainerConstructor,
    instanceKey: '',
    registry: null as unknown as StateContainerRegistry,
    container: null as unknown as StateContainer,
    trackedBloc: null,
    subscribe: (onStoreChange) => {
      consumer.notify = onStoreChange;
      return consumer.unlisten;
    },
    boundNonce: 0,
    rebindNonce: 0,
    renderedState: undefined,
    version: 0,
    notify: noop,
    unlisten: () => {
      consumer.notify = noop;
    },
    bump: () => {
      consumer.version++;
      consumer.notify();
    },
    getSnapshot: () => consumer.version,
    onChange: () => onChange(consumer),
    onDisposed: () => {
      // Nothing to rebind to once the whole registry is gone.
      if (consumer.registry.destroyed) return;
      consumer.rebindNonce++;
      consumer.bump();
    },
    offDispose: null,
    commit: () => commit(consumer),
    mount: () => teardown,
    interest: NO_PATHS,
    subscription: null,
    subscribedTo: null,
    paths: NO_PATHS,
    isSelectMode: false,
    selection: null,
    deps: null as unknown as DepSession,
    select: undefined,
    onMount: undefined,
    onUnmount: undefined,
    ownArgs: undefined,
    providerArgs: undefined,
    tracked: { current: null },
    disarm: null,
    proxyCache: null,
    ownedClass: null,
    ownedKey: '',
    ownedRegistry: null,
    ownedBloc: null,
  };
  const teardown = (): void => {
    release(consumer);
    detach(consumer);
    consumer.deps.dispose();
  };
  consumer.deps = new DepSession(id, consumer.bump);
  return consumer;
}

function bind(
  consumer: Consumer,
  BlocClass: StateContainerConstructor,
  instanceKey: string,
  registry: StateContainerRegistry,
  args: unknown,
): void {
  // No ref during render; the commit claims it. The registry sweeps the
  // instance if no commit ever does (SSR, discarded renders).
  const instance = registry.acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: false,
    args: args as ExtractArgs<StateContainerConstructor>,
    sweepIfUnowned: true,
  }) as unknown as StateContainer;

  // Dep proxies get `onDepHandle` too, so nested `.track()` calls (A→B→C)
  // record into this consumer's session.
  let depWrappers: Map<object, unknown> | undefined;
  const onDepHandle = (handle: object): unknown => {
    depWrappers ??= new Map();
    const cached = depWrappers.get(handle);
    if (cached !== undefined) return cached;
    const wrapper = makeDepWrapper(
      handle as DepHandleLike,
      registry,
      consumer.deps,
      consumer.tracked,
      onDepHandle,
    );
    depWrappers.set(handle, wrapper);
    return wrapper;
  };

  consumer.BlocClass = BlocClass;
  consumer.instanceKey = instanceKey;
  consumer.registry = registry;
  consumer.boundNonce = consumer.rebindNonce;
  consumer.container = instance;
  consumer.trackedBloc = buildTrackedProxy(
    instance,
    consumer.tracked,
    onDepHandle,
  );
}

/** Subscribe to the bound container. @returns true if it was not already. */
function attach(consumer: Consumer): boolean {
  const container = consumer.container;
  if (consumer.subscribedTo === container) return false;
  detach(consumer);
  const subscription = container.consume(consumer.onChange);
  subscription.setPaths(consumer.interest);
  consumer.subscription = subscription;
  consumer.subscribedTo = container;
  consumer.offDispose = container[ON_DISPOSE](consumer.onDisposed);
  return true;
}

function detach(consumer: Consumer): void {
  const container = consumer.subscribedTo;
  if (container === null) return;
  consumer.subscription?.dispose();
  consumer.subscription = null;
  consumer.offDispose?.();
  consumer.offDispose = null;
  consumer.subscribedTo = null;
}

function onChange(consumer: Consumer): void {
  if (consumer.isSelectMode) {
    const select = consumer.select;
    const container = consumer.subscribedTo;
    if (select && container !== null) {
      const next = select(container.state, container);
      const prev = consumer.selection;
      if (prev !== null && shallowArrayEqual(prev, next)) return;
      consumer.selection = next;
    }
  }
  consumer.bump();
}

function claim(consumer: Consumer): void {
  const { BlocClass, instanceKey, registry } = consumer;
  // The instance too: after an outside dispose the same key holds a new one.
  if (
    consumer.ownedBloc === consumer.container &&
    consumer.ownedClass === BlocClass &&
    consumer.ownedKey === instanceKey &&
    consumer.ownedRegistry === registry
  ) {
    return;
  }
  release(consumer);
  const live = registry.acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: true,
    refId: consumer.primaryRefId,
    args: resolveEffectiveArgs(
      consumer,
    ) as ExtractArgs<StateContainerConstructor>,
  });
  consumer.ownedClass = BlocClass;
  consumer.ownedKey = instanceKey;
  consumer.ownedRegistry = registry;
  consumer.ownedBloc = live;
  consumer.onMount?.(live);
  // The render captured a stale instance; re-render against the live one.
  if (live !== consumer.container) {
    consumer.rebindNonce++;
    consumer.bump();
  }
}

function release(consumer: Consumer): void {
  const { ownedClass, ownedRegistry, ownedBloc } = consumer;
  if (ownedClass === null || ownedRegistry === null || ownedBloc === null) {
    return;
  }
  // Before release, so the bloc is still alive in the callback.
  consumer.onUnmount?.(ownedBloc);
  consumer.ownedClass = null;
  consumer.ownedRegistry = null;
  consumer.ownedBloc = null;
  deferRelease(
    ownedRegistry,
    ownedClass,
    consumer.ownedKey,
    consumer.primaryRefId,
    ownedBloc,
  );
}

function commit(consumer: Consumer): void {
  claim(consumer);
  const attached = attach(consumer);
  // Getters called after commit read live state, not this render's proxy.
  consumer.tracked.current = null;
  const disarm = consumer.disarm;
  if (disarm !== null) {
    consumer.disarm = null;
    disarm();
  }
  const deps = consumer.deps;
  deps.disarm();
  const primary = consumer.container;
  const changedSinceRender = primary.state !== consumer.renderedState;
  if (consumer.isSelectMode) {
    // A later switch back to auto-track must reconcile in full.
    deps.invalidate();
    if (changedSinceRender) onChange(consumer);
    return;
  }
  // A change between render and commit was diffed against the previous
  // interest, which may lack paths only this render read.
  if (changedSinceRender) consumer.bump();
  consumer.paths = deps.settle();
  if (!attached && deps.isUnchanged()) return;

  setInterest(consumer, consumer.paths);
  deps.reconcile(consumer.registry);
}

const setInterest = (consumer: Consumer, interest: PathSet): void => {
  consumer.interest = interest;
  consumer.subscription?.setPaths(interest);
};

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
