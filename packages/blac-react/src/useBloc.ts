import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  getRegistry,
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
import { RegistryContext } from './RegistryProvider';
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
 *   recorded path changes. Backed by `@dirtytalk/structural`'s
 *   `trackRender` + the container's path-scoped `DirtyChannel`.
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

  // Registry scoping: the nearest RegistryProvider wins over the module-global
  // default. Resolved once here (top level, per React's rules of hooks) and
  // closed over by every effect/memo below instead of each calling
  // `getRegistry()` directly.
  const registry = useContext(RegistryContext) ?? getRegistry();

  // Everything this hook instance keeps between renders lives on one object
  // (see `Consumer`) rather than in a ref per field: fewer hook slots per
  // mount, and the effects below read the latest values off it directly.
  const consumerRef = useRef<Consumer | null>(null);
  const consumer = (consumerRef.current ??= createConsumer());
  const consumerId = consumer.id;

  consumer.select = options?.select;
  consumer.onMount = options?.onMount;
  consumer.onUnmount = options?.onUnmount;

  // ---------------------------------------------------------------------------
  // Identity resolution
  //
  // Priority: own args > provider args (for this bloc class) > none.
  //
  // The memo is keyed on the resolved instance key, so a fresh args literal
  // each render only rebuilds when it maps to a different instance.
  // `structuralKey` caches by args identity, so stable args cost nothing.
  // ---------------------------------------------------------------------------
  consumer.ownArgs = (options as { args?: ExtractArgs<T> } | undefined)?.args;
  consumer.providerArgs = useProvidedArgs(BlocClass);
  const effectiveArgs = resolveEffectiveArgs(consumer) as
    | ExtractArgs<T>
    | undefined;
  const instanceKey = registry.resolveKey(BlocClass, undefined, effectiveArgs);

  // Rebind nonce: bumped by the ownership layout-effect when the instance the
  // render captured was disposed + recreated out from under us. This happens on
  // a same-commit ownership handoff of a shared (non-keepAlive) key — the sole
  // prior owner's effect cleanup releases refs→0 and SYNCHRONOUSLY disposes the
  // instance before this consumer's layout setup re-acquires (creating a fresh
  // one) — and equivalently under StrictMode's setup→cleanup→setup double-invoke
  // for a lone owner. Threaded into the memo deps so bumping it rebuilds `bloc`
  // and its tracked proxy against the LIVE registry entry: the proxy binds its
  // target at construction and cannot be retargeted in place.
  //
  // Held on the consumer rather than in useReducer state because the re-render
  // it needs is already delivered by the consumer's version bump through uSES.
  const rebindNonce = consumer.rebindNonce;

  const { bloc, trackedBloc } = useMemo<{
    bloc: TBloc;
    trackedBloc: TBloc;
  }>(() => {
    // Render only ENSUREs the instance exists (no ref). Ownership is claimed in
    // the layout effect below, so an abandoned/uncommitted render can never
    // leak a ref and a memo re-run can never double-count one (R3/R4).
    const instance = registry.acquire(BlocClass, instanceKey, {
      canCreate: true,
      countRef: false,
      args: effectiveArgs,
      // A render that never commits (SSR, a discarded render) leaves this
      // instance ref-less forever; let the registry sweep it if the layout
      // effect below never claims ownership.
      sweepIfUnowned: true,
    }) as TBloc;

    // Build a session-bound wrapper for a dep handle the first time a getter
    // reads it off `this`; cache per handle so the wrapper identity is stable.
    // `onDepHandle` is threaded into each dep's tracked proxy too, so a nested
    // `this.<otherHandle>.track()` inside a dep's getter records into the SAME
    // consumer session — that is what makes deep chains (A→B→C) reactive.
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

  // The memo is the single writer of the container the consumer reads and
  // subscribes to; a re-key or rebind retargets it here, before any effect runs.
  consumer.container = bloc as unknown as StateContainer;

  // ---------------------------------------------------------------------------
  // Channel subscription via useSyncExternalStore.
  //
  // `subscribe` is memoised on [BlocClass, instanceKey] — NOT on `bloc` — so a
  // genuine re-key (args change, OR a BlocClass swap) re-subscribes while a
  // pure instance replacement under the same class+key does not churn the
  // subscription.
  //
  // `BlocClass` MUST stay in the dep array even though `instanceKey` alone
  // often determines identity: `resolveInstanceKey`/`resolveKey` collapse to
  // the same `DEFAULT_STRUCTURAL_KEY` sentinel across DIFFERENT classes when
  // neither has args nor a `static key` (e.g.
  // `useBloc(cond ? AdminBloc : UserBloc)`). Memoising on `bloc` alone would
  // reintroduce that leak: swapping classes at that shared key would never
  // re-subscribe.
  //
  // We talk directly to `bloc.channel` — the StructuralContainer's path-scoped
  // DirtyChannel. Subscribing with a dynamic interest function lets us narrow
  // wakeups per consumer, so a component only re-renders when a path it
  // actually read changes (rather than on every state change).
  // ---------------------------------------------------------------------------
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
      // No render→subscribe mount-gap compensation is needed: the channel
      // accumulates marks and flushes on its scheduler, so an emit raised
      // during render is still pending when this subscriber registers and is
      // delivered by that flush. The pre-uSES hook needed `renderStateRef` +
      // a manual force dispatch here only because its subscribe ran in a
      // passive effect keyed on the instance.
      return () => {
        consumer.notify = noop;
        unsubscribe();
        container.unregisterConsumer(consumerId);
      };
    },
    // `rebindNonce` is here for the same reason it is in the memo above: a
    // rebind swaps the underlying instance (and therefore its channel) without
    // changing the class or key, so the subscription must be re-established
    // against the live container.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [BlocClass, instanceKey, consumerId, rebindNonce, registry],
  );

  useSyncExternalStore(
    subscribe,
    consumer.getSnapshot,
    consumer.getServerSnapshot,
  );

  // ---------------------------------------------------------------------------
  // Ownership + mount / unmount lifecycle.
  //
  // The ownership ref is claimed HERE (a layout effect), not in the render/memo,
  // so acquire and release are perfectly paired: a memo re-run can no longer
  // double-count (R3) and an uncommitted render can no longer leak (R4). The
  // render-time `acquire` above schedules a sweep that disposes the entry if
  // it is still unowned after `unownedSweepDelayMs`; a layout effect claims
  // ownership as early as possible within that window.
  //
  // Keyed on [BlocClass, instanceKey, consumerId] for the same reason the
  // subscription is — see the `BlocClass`-in-deps hazard documented above.
  //
  // `acquire` returns the authoritative LIVE instance for the key. onMount /
  // onUnmount fire with that owned live instance and stay co-located with
  // acquire/release so onUnmount(bloc) runs BEFORE release(...) within one
  // cleanup, keeping the instance alive while the callback runs.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    const live = registry.acquire(BlocClass, instanceKey, {
      canCreate: true,
      countRef: true,
      refId: consumer.primaryRefId,
      args: resolveEffectiveArgs(consumer),
    }) as TBloc;
    consumer.ownedBloc = live;
    consumer.onMount?.(live as InstanceType<T>);
    // Rebind if the render captured a stale (disposed/replaced) instance so the
    // component renders + subscribes against the live registry entry, not a
    // disposed one. Only bumps on an actual mismatch, so it can fire at most
    // once per handoff and never loops (the re-ensured `bloc` equals `live`,
    // and this effect is not keyed on `bloc` so it won't re-run and re-release).
    if (live !== bloc) {
      consumer.rebindNonce++;
      consumer.bump();
    }
    return () => {
      consumer.onUnmount?.((consumer.ownedBloc ?? bloc) as InstanceType<T>);
      registry.release(BlocClass, instanceKey, false, consumer.primaryRefId);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [BlocClass, instanceKey, consumerId, registry]);

  // ---------------------------------------------------------------------------
  // Snapshot
  //
  // - Auto-track: wrap state in trackRender, record paths into consumer.paths,
  //   and re-register with the container so the skeleton picks up new interest.
  // - Select-mode: return state directly; the subscription callback compares
  //   selections to decide whether to re-render.
  // ---------------------------------------------------------------------------
  const container = consumer.container;
  const rawState = container.state as ExtractState<T>;
  const select = consumer.select;
  consumer.isSelectMode = select !== undefined;
  let state: ExtractState<T>;
  if (select !== undefined) {
    state = rawState;
    // Recomputed every render: the selector may close over props, and the
    // instance may have changed since the last render.
    consumer.selection = select(rawState, bloc as InstanceState<T>);
    // Select-mode wakes on every change and filters in the callback.
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
    // Frozen by the commit layout effect below, once the synchronous
    // render+commit pass is over: all render-time JSX reads still record;
    // reads afterwards — effects, event handlers, async callbacks, devtools
    // inspecting `state` — hit the disarmed proxy and record nothing, so this
    // render's path set can't be polluted by work that outlives it.
    consumer.disarm = tracked.disarm;
    // Rebuild the per-consumer session for this render. The primary bloc is the
    // first uniform entry; its `paths` are the SAME PathSet object the proxy
    // mutates during JSX (so it stays live as getters record leaves). Dep
    // entries are appended during JSX as `this.<handle>.track()` runs. Cleared
    // here (not in the layout effect) so a render that no longer tracks a dep
    // produces a session without it, and the reconcile drops it.
    consumer.deps.begin(container, tracked.paths);
    // NOTE: registerConsumerPaths is intentionally NOT called here. The
    // proxy hasn't been accessed yet, so `tracked.paths` is an empty Set
    // that the proxy will mutate during JSX evaluation. Registering at
    // this point would store an empty interest with the container and
    // freeze the skeleton at that snapshot — subsequent emits would
    // diff against an empty skeleton and silently drop wakeups. The
    // useLayoutEffect below registers the populated set after render.
  }

  // After the render commits, consumer.paths is the consumer's actual leaf
  // interest (populated by the proxy during JSX evaluation). Re-register with
  // the container so the skeleton reflects the latest paths, and expand the
  // interest to include ancestor paths for the channel subscription.
  //
  // useLayoutEffect runs before the browser paints (and before any emit
  // triggered by another effect), so the skeleton is fresh by the time the
  // next emit fires.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    // Clear the render-time tracking proxy now that JSX has been evaluated and
    // committed. Getters invoked after this point (event handlers, effects,
    // method→getter chains) fall through to live state instead of reading this
    // render's frozen snapshot. The render body re-seeds it next render.
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

// ---------------------------------------------------------------------------
// Per-consumer store object.
// ---------------------------------------------------------------------------

const noop = (): void => {};

/**
 * Everything one `useBloc` call keeps between renders; one per mounted hook.
 *
 * `version` is the `useSyncExternalStore` snapshot: a plain number, so
 * `getSnapshot` is stable and never allocates. `bump` increments it BEFORE
 * calling `notify` — uSES requires `getSnapshot()` to already reflect the
 * change by the time it is notified, and the channel delivers deferred, so
 * doing it the other way round silently drops renders.
 */
interface Consumer {
  /** Stable id for the structural container's consumer registry. */
  id: string;
  /** Registry refId for the primary bloc. Derived once
   * from `id` so the acquire and release sites can never drift apart — a
   * mismatch would leak the ref and keep the bloc alive past unmount. */
  primaryRefId: string;
  /** The live container this consumer currently reads and subscribes to.
   * Written by the render memo, which is its single writer. */
  container: StateContainer;
  version: number;
  /** uSES's wake callback; `noop` while unsubscribed. */
  notify: () => void;
  bump: () => void;
  getSnapshot: () => number;
  getServerSnapshot: () => number;
  /** Channel interest: expanded leaf paths, or ALL_PATHS in select-mode. */
  interest: PathSet;
  /** Raw tracked leaf paths from the latest render (skeleton registration). */
  paths: PathSet;
  isSelectMode: boolean;
  /** Last select-mode result, compared before waking. */
  selection: unknown[] | null;
  deps: DepSession;
  /** Latest option callbacks, refreshed every render. Typed loosely: the
   * hook's `T` is per call site, and the consumer outlives any one call. */
  select: ((state: any, bloc: any) => unknown[]) | undefined;
  onMount: ((bloc: any) => void) | undefined;
  onUnmount: ((bloc: any) => void) | undefined;
  /** Latest args, refreshed every render. */
  ownArgs: unknown;
  providerArgs: unknown;
  /** Current render's tracking proxy; `null` outside a tracked render. Shared
   * with the bloc's tracked proxy and dep wrappers, which read `.current`. */
  tracked: { current: unknown };
  /** Freezes the current render's proxy tree; run by the commit effect. */
  disarm: (() => void) | null;
  proxyCache: ProxyCache | null;
  /** Dep handle -> session-bound wrapper (see `makeDepWrapper`). */
  depWrappers: Map<object, unknown> | null;
  rebindNonce: number;
  /** Instance actually owned (ref held) by the ownership layout-effect, read
   * by its cleanup so onUnmount always fires with the owned instance. */
  ownedBloc: unknown;
}

function createConsumer(): Consumer {
  const id = `useBloc-${nextConsumerId++}`;
  const consumer: Consumer = {
    id,
    primaryRefId: `useBloc@${id}`,
    // Assigned by the render memo before any read; never observed unset.
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

// Own args win over provider args; provider args win over no args. Read off
// the consumer (refreshed every render) so the render-time acquire and the
// layout effect resolve args identically — the effect re-creates the instance
// when the rendered entry was disposed (StrictMode remount), and dropping args
// there would run `init(undefined)`.
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
