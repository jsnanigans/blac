import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  DEP_BRAND,
  getRegistry,
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
  pathSetEquals,
  trackRender,
  PathInterner,
  ProxyCache,
  type PathSet,
} from '@dirtytalk/structural';
import { useProvidedArgs } from './BlocProvider';
import { RegistryContext } from './RegistryProvider';
import { buildTrackedProxy } from './buildTrackedProxy';
import type { UseBlocOptions, UseBlocReturn } from './types';

let nextConsumerId = 0;

// Sentinel that can never `Object.is`-equal a real args value (including
// `undefined`). Used to lazily seed args-key caches so the structural key is
// computed only when the guard actually runs, never on every render.
const ARGS_UNSET: unique symbol = Symbol('blac.argsKeyUnset');

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
 * @returns Tuple of `[state, bloc, ref]`
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
  // Args are user-supplied; callers commonly pass a fresh object literal each
  // render. Memoising on `args` directly would bust every render. We compute a
  // structural key (JSON.stringify) for the useMemo dep instead — undefined
  // args (void-args blocs) collapse to an undefined key. The key is only
  // recomputed when the args REFERENCE changes, so a stable args object costs
  // nothing per render.
  // ---------------------------------------------------------------------------
  const ownArgs = (options as { args?: ExtractArgs<T> } | undefined)?.args;
  consumer.ownArgs = ownArgs;
  if (!Object.is(consumer.ownArgsKeyFor, ownArgs)) {
    consumer.ownArgsKeyFor = ownArgs;
    consumer.ownArgsKey =
      ownArgs === undefined ? undefined : JSON.stringify(ownArgs);
  }
  const ownArgsKey = consumer.ownArgsKey;

  // Read provided args from the nearest BlocProvider for this bloc class.
  const providerArgs = useProvidedArgs(BlocClass);
  consumer.providerArgs = providerArgs;
  if (!Object.is(consumer.providerArgsKeyFor, providerArgs)) {
    consumer.providerArgsKeyFor = providerArgs;
    consumer.providerArgsKey =
      providerArgs === undefined ? undefined : JSON.stringify(providerArgs);
  }
  const providerArgsKey = consumer.providerArgsKey;

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

  const { bloc, instanceKey, trackedBloc } = useMemo<{
    bloc: TBloc;
    instanceKey: string;
    trackedBloc: TBloc;
  }>(() => {
    const effectiveArgs = resolveEffectiveArgs(consumer) as
      | ExtractArgs<T>
      | undefined;

    const resolvedKey = resolveInstanceKey(BlocClass, effectiveArgs);
    // Render only ENSUREs the instance exists (no ref). Ownership is claimed in
    // the layout effect below, so an abandoned/uncommitted render can never
    // leak a ref and a memo re-run can never double-count one (R3/R4).
    const instance = registry.acquire(BlocClass, resolvedKey, {
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
        consumer,
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

    return {
      bloc: instance,
      instanceKey: resolvedKey,
      trackedBloc: proxy as TBloc,
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [BlocClass, ownArgsKey, providerArgsKey, rebindNonce, registry]);

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
    [BlocClass, instanceKey, consumerId, rebindNonce],
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
  // double-count (R3) and an uncommitted render can no longer leak (R4). It
  // MUST stay a *layout* effect: the render-time `acquire` above schedules a
  // microtask sweep that disposes entries still unowned when it runs. Layout
  // effects flush before that microtask drains; passive effects do not, so
  // moving this acquire to a passive effect would let the sweep dispose live
  // mounts.
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
    // Seed the last selection on the first render so we don't fire an
    // immediate "different from null" wakeup on the first emit.
    if (consumer.selection === null) {
      consumer.selection = select(rawState, bloc as InstanceState<T>);
    }
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
    const session = consumer.session;
    session.clear();
    session.set(container, { kind: 'primary', paths: tracked.paths });
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
    if (consumer.isSelectMode) {
      // Switching into (or staying in) select-mode: invalidate any prior full
      // reconcile so a later switch back to auto-track mode never mistakes a
      // stale signature for "unchanged" and skips a needed reconcile.
      consumer.lastReconcile = null;
      return;
    }
    const primary = consumer.container;
    const paths = consumer.paths;
    const session = consumer.session;

    // ---------------------------------------------------------------------
    // Short-circuit: if the primary path set AND the full dep session are
    // set-equal (paths + key/refId/args) to the last FULL reconcile, none of
    // registerConsumerPaths/subscribe/unsubscribe/expandWithAncestors below
    // can have anything new to do — skip the whole block. Any mismatch, or
    // `consumer.lastReconcile === null` (first commit, or the immediately
    // preceding commit was select-mode / uncertain), falls through to the
    // full reconcile. Never skip on uncertainty — a missed re-subscribe would
    // leave a stale/dropped subscription.
    // ---------------------------------------------------------------------
    const last = consumer.lastReconcile;
    if (
      last !== null &&
      last.primaryContainer === primary &&
      pathSetEquals(last.primaryPaths, paths)
    ) {
      let unchanged = last.deps.size === session.size - 1;
      if (unchanged) {
        for (const [depContainer, entry] of session) {
          if (entry.kind === 'primary') continue;
          const prevEntry = last.deps.get(depContainer);
          if (
            prevEntry === undefined ||
            prevEntry.key !== entry.key ||
            prevEntry.refId !== entry.refId ||
            !Object.is(prevEntry.args, entry.args) ||
            !pathSetEquals(prevEntry.paths, entry.paths)
          ) {
            unchanged = false;
            break;
          }
        }
      }
      if (unchanged) return;
    }

    primary.registerConsumerPaths(consumerId, paths);
    // Register the *normal* leaf paths above for the source-side skeleton, then
    // build the channel interest as leaves + ancestor-watch ids so that an
    // atomic `patch` replacement of a parent (e.g. the array 'items') wakes a
    // consumer that tracked a child (e.g. 'items.length').
    consumer.interest = expandWithAncestors(paths, primary.interner);

    // -----------------------------------------------------------------------
    // Reconcile DEP containers (cross-bloc `.track()` interest).
    //
    // The primary bloc keeps its own dedicated subscription above; this block
    // manages only the *dep* containers recorded in the session this render.
    // We diff the new dep set vs the previously-subscribed set:
    //   - new dep      -> acquire was already done in `.track()`; subscribe its
    //                     channel + registerConsumerPaths + seed interest.
    //   - surviving    -> refresh its interest ref (subscribe closure reads it).
    //   - dropped      -> unsubscribe, unregisterConsumer, and release its ref.
    // -----------------------------------------------------------------------
    const subs = consumer.depSubs;

    // Pass 1: drop containers no longer in the session.
    for (const [depContainer, sub] of subs) {
      if (!session.has(depContainer)) {
        sub.unsubscribe();
        depContainer.unregisterConsumer(consumerId);
        registry.release(sub.Type, sub.key, false, sub.refId);
        subs.delete(depContainer);
      }
    }

    // Pass 2: add/refresh containers in the session (skip the primary).
    for (const [depContainer, entry] of session) {
      if (entry.kind === 'primary') continue;
      const interest = expandWithAncestors(entry.paths, depContainer.interner);
      depContainer.registerConsumerPaths(consumerId, entry.paths);
      const existing = subs.get(depContainer);
      if (existing) {
        existing.interestRef.current = interest;
        continue;
      }
      // First commit that sees this dep: take the ownership ref HERE (not in
      // render/`.track()`), so an uncommitted render can never leak it (R4).
      registry.acquire(entry.Type, entry.key, {
        canCreate: true,
        countRef: true,
        refId: entry.refId,
        args: entry.args,
      });
      const interestRef: { current: PathSet } = { current: interest };
      const unsubscribe = depContainer.channel.subscribe(
        () => interestRef.current,
        () => consumer.bump(),
      );
      subs.set(depContainer, {
        unsubscribe,
        interestRef,
        Type: entry.Type,
        key: entry.key,
        refId: entry.refId,
        args: entry.args,
      });
    }

    // Capture this full reconcile's shape for the NEXT commit's short-circuit
    // check above. `paths`/`entry.paths` are fresh Sets seeded this render
    // (trackRender/unionPaths always allocate new Sets, never mutate one from
    // a prior render) — safe to keep direct references without cloning.
    const depsSignature = new Map<StateContainer, ReconcileDepSignature>();
    for (const [depContainer, entry] of session) {
      if (entry.kind === 'primary') continue;
      depsSignature.set(depContainer, {
        paths: entry.paths,
        key: entry.key,
        refId: entry.refId,
        args: entry.args,
      });
    }
    consumer.lastReconcile = {
      primaryContainer: primary,
      primaryPaths: paths,
      deps: depsSignature,
    };
  });

  // Unmount: tear down every dep subscription + ref exactly once. Kept in its
  // own effect (consumerId is stable for the component's lifetime, so this only
  // runs on final unmount, not on every reconcile). consumer.depSubs is mutated
  // in place by the reconcile, so the captured Map reference still holds the
  // live set at unmount.
  useEffect(() => {
    const subs = consumer.depSubs;
    return () => {
      for (const [depContainer, sub] of subs) {
        sub.unsubscribe();
        depContainer.unregisterConsumer(consumerId);
        registry.release(sub.Type, sub.key, false, sub.refId);
      }
      subs.clear();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [consumerId, registry]);

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
  /** Registry refIds for the primary bloc and its tracked deps. Derived once
   * from `id` so the acquire and release sites can never drift apart — a
   * mismatch would leak the ref and keep the bloc alive past unmount. */
  primaryRefId: string;
  depRefId: string;
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
  session: Map<StateContainer, SessionEntry>;
  depSubs: Map<StateContainer, DepSub>;
  lastReconcile: ReconcileSignature | null;
  /** Latest option callbacks, refreshed every render. Typed loosely: the
   * hook's `T` is per call site, and the consumer outlives any one call. */
  select: ((state: any, bloc: any) => unknown[]) | undefined;
  onMount: ((bloc: any) => void) | undefined;
  onUnmount: ((bloc: any) => void) | undefined;
  /** Latest args plus the structural key cached against their identity. */
  ownArgs: unknown;
  ownArgsKeyFor: unknown;
  ownArgsKey: string | undefined;
  providerArgs: unknown;
  providerArgsKeyFor: unknown;
  providerArgsKey: string | undefined;
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
    depRefId: `useBloc@${id}:dep`,
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
    session: new Map(),
    depSubs: new Map(),
    lastReconcile: null,
    select: undefined,
    onMount: undefined,
    onUnmount: undefined,
    ownArgs: undefined,
    ownArgsKeyFor: ARGS_UNSET,
    ownArgsKey: undefined,
    providerArgs: undefined,
    providerArgsKeyFor: ARGS_UNSET,
    providerArgsKey: undefined,
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

// ---------------------------------------------------------------------------
// Cross-bloc session types + dep-handle wrapper.
// ---------------------------------------------------------------------------

/**
 * One entry in a consumer's per-render session map. Discriminated on `kind`:
 * the primary bloc is managed by its own dedicated subscription, while dep
 * entries carry the registry coordinates the reconcile needs to release their
 * ref.
 */
type SessionEntry =
  | {
      kind: 'primary';
      /** Tracked leaf paths recorded against the primary this render. */
      paths: PathSet;
    }
  | {
      kind: 'dep';
      /** Tracked leaf paths recorded against this dep this render. */
      paths: PathSet;
      /** Constructor for registry release. */
      Type: StateContainerConstructor;
      /** Resolved instance key for registry release. */
      key: string;
      /** refId held for this dep (released on drop/unmount). */
      refId: string;
      /** Construction args, used by the reconcile pass to acquire the ref. */
      args: unknown;
    };

/** A live dep-channel subscription tracked between renders for reconciliation. */
interface DepSub {
  unsubscribe: () => void;
  interestRef: { current: PathSet };
  Type: StateContainerConstructor;
  key: string;
  refId: string;
  args: unknown;
}

/**
 * Snapshot of one dep's shape from the last FULL reconcile, compared against
 * the current session entry to decide whether the dep-reconcile layout effect
 * can short-circuit (see `Consumer.lastReconcile`).
 */
interface ReconcileDepSignature {
  paths: PathSet;
  key: string;
  refId: string;
  args: unknown;
}

/** Snapshot of the last FULL dep-reconcile layout effect run. */
interface ReconcileSignature {
  /** The primary container this signature was captured against (identity
   * check — a rebind/re-key swaps this even if the tracked paths happen to
   * be textually identical, and must never be mistaken for "unchanged"). */
  primaryContainer: StateContainer;
  primaryPaths: PathSet;
  deps: Map<StateContainer, ReconcileDepSignature>;
}

/** Per-access options shared by both dep accessors. */
interface DepAccessOptionsLike {
  args?: unknown;
}

/** Structural shape of a branded `depend()` handle as seen from React. */
interface DepHandleLike {
  track(options?: DepAccessOptionsLike): [unknown, StateContainer];
  untracked(options?: DepAccessOptionsLike): StateContainer;
  readonly [DEP_BRAND]: {
    Type: StateContainerConstructor;
    defaultArgs?: unknown;
  };
}

/**
 * Build the per-consumer wrapper that replaces a branded dep handle inside a
 * tracked getter's `this`. The wrapper exposes the same accessors as the core
 * handle and overrides `.track()`:
 *
 * - **Inside a render** (`consumer.tracked.current != null`): resolve (ENSURE,
 *   no ref) the dep, `trackRender` its state, merge the recorded paths into the
 *   session entry, build/reuse a tracked proxy for the dep so its OWN getters
 *   track too, and return `[trackedValue, depProxy]`. The ownership ref is taken
 *   by the layout-effect reconcile pass, not here.
 * - **Outside a render**: degrade to live `[dep.state, dep]` — matches the core
 *   base impl, safe in event handlers/effects/methods.
 *
 * `.untracked()` always returns the live instance with no subscription.
 *
 * Args resolve at call time (`options.args ?? defaultArgs`), so a single handle
 * can resolve different dep instances across calls; tracked-proxy state is
 * therefore cached per resolved instance, not per handle. Guards against a
 * container re-entering tracking within the same render (mutual A↔B deps): if
 * the dep already has a non-primary session entry this render, reuse its proxy
 * + union its paths instead of re-acquiring.
 */
function makeDepWrapper(
  handle: DepHandleLike,
  registry: StateContainerRegistry,
  consumer: Consumer,
  onDepHandle: (handle: object) => unknown,
): DepHandleLike {
  const brand = handle[DEP_BRAND];
  const refId = consumer.depRefId;
  // Per-resolved-instance tracked-state ref + proxy. Call-time args mean one
  // handle can resolve several instances, so cache is keyed by the instance.
  const perDep = new Map<
    StateContainer,
    { ref: { current: unknown }; proxy: StateContainer }
  >();
  // One ProxyCache shared across every instance this handle resolves to
  // (call-time args can resolve different dep instances across calls) — safe
  // because ProxyCache's internal map is keyed by target object identity, so
  // unrelated instances' objects never collide in it.
  const proxyCache = new ProxyCache();

  const resolve = (options?: DepAccessOptionsLike) => {
    const args = options?.args ?? brand.defaultArgs;
    const key = registry.resolveKey(brand.Type, undefined, args);
    const dep = registry.ensure(
      brand.Type,
      key,
      args,
    ) as unknown as StateContainer;
    return { dep, key, args };
  };

  const wrapper = {
    untracked: (options?: DepAccessOptionsLike) => resolve(options).dep,
    track: (options?: DepAccessOptionsLike) => {
      const { dep, key, args } = resolve(options);

      // Outside a render: live values, no subscription (core base behavior).
      if (consumer.tracked.current == null) {
        return [dep.state, dep];
      }

      const session = consumer.session;
      const existing = session.get(dep);

      // Render only ENSUREs the dep instance (via `resolve()` above); it does
      // NOT take a ref. Ownership is claimed by the layout-effect reconcile
      // pass-2 the first commit it sees this dep, and released on drop/unmount.
      // This keeps acquire/release paired so an uncommitted render can't leak a
      // dep ref (R4).

      const tracked = trackRender(dep.state, dep.interner, proxyCache);
      let cache = perDep.get(dep);
      if (cache === undefined) {
        const ref = { current: tracked.value as unknown };
        cache = { ref, proxy: buildTrackedProxy(dep, ref, onDepHandle).proxy };
        perDep.set(dep, cache);
      } else {
        cache.ref.current = tracked.value;
      }

      if (existing !== undefined) {
        // Re-entry this render (`.track()` twice, or a mutual cycle): union the
        // new paths into the existing entry rather than re-acquiring.
        existing.paths = unionPaths(existing.paths, tracked.paths);
      } else {
        session.set(dep, {
          kind: 'dep',
          paths: tracked.paths,
          Type: brand.Type,
          key,
          refId,
          args,
        });
      }

      return [tracked.value, cache.proxy];
    },
  } as DepHandleLike;

  Object.defineProperty(wrapper, DEP_BRAND, {
    value: brand,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return wrapper;
}

/** Union two PathSets (ALL_PATHS dominates). */
function unionPaths(a: PathSet, b: PathSet): PathSet {
  if (a === ALL_PATHS || b === ALL_PATHS) return ALL_PATHS;
  const out = new Set<number>(a as Set<number>);
  for (const id of b as Set<number>) out.add(id);
  return out;
}

const shallowArrayEqual = (a: unknown[], b: unknown[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
};

/**
 * Expand a PathSet to include an *ancestor-watch* id for every ancestor of
 * every tracked leaf.
 *
 * The auto-tracker records leaf paths (e.g. `'items.length'`), but
 * `StructuralContainer.patch` can only mark the parent (`'items'`) when it
 * replaces a value atomically (arrays, `null`, primitives — it can't see
 * inside). Without expansion, a subscriber with interest `{'items.length'}`
 * would miss a `patch`-triggered atomic-replacement of `items`.
 *
 * Ancestors are added under the interner's *ancestor-watch* lane
 * (`ancestorWatchIds`), NOT as normal ids. The source emits a matching
 * ancestor-watch mark only for paths it replaces atomically — never for a
 * plain-object structural pulse-up. So `{'items.length'}` wakes when the array
 * `items` is replaced, but `{'user.email'}` does NOT wake when a sibling
 * `user.name` changes and pulses `user` up: pulse-up `user` is a normal id and
 * the ancestor-watch `user` only intersects another ancestor-watch `user`.
 *
 * Example: leaf `'a.b.c'` adds ancestor-watch ids for `'a.b'` and `'a'` (but
 * NOT the `''` root — a root change is covered by `ALL_PATHS` from the source,
 * and `''` would wake this consumer on every field change).
 *
 * Returns `paths` itself when no leaf has an ancestor (top-level fields only);
 * the set is frozen by then (see `Consumer.disarm`), so sharing it is safe.
 */
function expandWithAncestors(paths: PathSet, interner: PathInterner): PathSet {
  if (paths === ALL_PATHS) return ALL_PATHS;
  const leafPaths = paths as Set<number>;
  let expanded: Set<number> | undefined;
  for (const id of leafPaths) {
    const watch = interner.ancestorWatchIds(id);
    if (watch.length === 0) continue;
    expanded ??= new Set<number>(leafPaths);
    for (let i = 0; i < watch.length; i++) expanded.add(watch[i]);
  }
  return expanded ?? paths;
}
