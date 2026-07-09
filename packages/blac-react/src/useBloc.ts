import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type RefObject,
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
import { buildTrackedProxy } from './buildTrackedProxy';
import type { ComponentRef, UseBlocOptions, UseBlocReturn } from './types';

let nextConsumerId = 0;

// Sentinel that can never `Object.is`-equal a real args value (including
// `undefined`). Used to lazily seed args-key refs so the structural key is
// computed only when the guard actually runs, never on every render.
const ARGS_UNSET: unique symbol = Symbol('blac.argsKeyUnset');

// Registry refId formats for a consumer's primary bloc and its tracked deps.
// Centralised so the `acquire` and `release` sites can never drift apart — a
// mismatch would leak the ref and keep the bloc alive past unmount.
const primaryRefId = (consumerId: string): string => `useBloc@${consumerId}`;
const depRefId = (consumerId: string): string => `useBloc@${consumerId}:dep`;

/**
 * React hook that connects a component to a state container with automatic
 * re-render on state changes.
 *
 * Two tracking modes:
 * - **Auto-tracking** (default): the returned state value is a proxy that
 *   records read paths during render. The component re-renders when any
 *   recorded path changes. Backed by `@dirtytalk/structural`'s
 *   {@link trackRender} + the container's path-scoped `DirtyChannel`.
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
 * @template T - The state container constructor type (inferred from BlocClass)
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
 */
export function useBloc<
  T extends StateContainerConstructor = StateContainerConstructor,
>(
  BlocClass: T,
  options?: UseBlocOptions<T>,
): UseBlocReturn<T, ExtractState<T>> {
  type TBloc = InstanceState<T>;

  const componentRef = useRef<ComponentRef>({});

  // Stable per-consumer id (for the structural container's consumer registry).
  // Plain counter rather than `useId()` so we don't compete with internal hooks
  // for SSR id slots.
  const consumerIdRef = useRef<string | null>(null);
  if (consumerIdRef.current === null) {
    consumerIdRef.current = `useBloc-${nextConsumerId++}`;
  }
  const consumerId = consumerIdRef.current;
  // Reserve a useId slot — kept for forwards compatibility and to match
  // BlocProvider-driven SSR hydration alignment (no-op call).
  useId();

  // Refs that always carry the latest option callbacks, so the commit effect
  // can read them without re-keying.
  const selectRef = useRef(options?.select);
  selectRef.current = options?.select;
  const onMountRef = useRef(options?.onMount);
  onMountRef.current = options?.onMount;
  const onUnmountRef = useRef(options?.onUnmount);
  onUnmountRef.current = options?.onUnmount;

  // ---------------------------------------------------------------------------
  // Identity resolution
  //
  // Priority: own args > provider args (for this bloc class) > none.
  //
  // Args are user-supplied; callers commonly pass a fresh object literal each
  // render. Memoising on `args` directly would bust every render. We compute a
  // structural key (JSON.stringify) for the useMemo dep instead — undefined
  // args (void-args blocs) collapse to an undefined key.
  // ---------------------------------------------------------------------------
  const ownArgs = (options as { args?: ExtractArgs<T> } | undefined)?.args;
  const ownArgsRef = useRef(ownArgs);
  ownArgsRef.current = ownArgs;
  // Fast-path: only recompute the structural key when the args REFERENCE
  // changes. Callers commonly pass a stable args object (e.g. memoised or
  // module-level), so this skips a JSON.stringify call every render.
  const ownArgsKeyRef = useRef<{ ref: unknown; key: string | undefined }>({
    ref: ARGS_UNSET,
    key: undefined,
  });
  if (!Object.is(ownArgsKeyRef.current.ref, ownArgs)) {
    ownArgsKeyRef.current = {
      ref: ownArgs,
      key: ownArgs === undefined ? undefined : JSON.stringify(ownArgs),
    };
  }
  const ownArgsKey = ownArgsKeyRef.current.key;

  // Read provided args from the nearest BlocProvider for this bloc class.
  const providerArgs = useProvidedArgs(BlocClass);
  const providerArgsRef = useRef(providerArgs);
  providerArgsRef.current = providerArgs;
  // Same reference fast-path as ownArgsKey above.
  const providerArgsKeyRef = useRef<{ ref: unknown; key: string | undefined }>(
    {
      ref: ARGS_UNSET,
      key: undefined,
    },
  );
  if (!Object.is(providerArgsKeyRef.current.ref, providerArgs)) {
    providerArgsKeyRef.current = {
      ref: providerArgs,
      key: providerArgs === undefined ? undefined : JSON.stringify(providerArgs),
    };
  }
  const providerArgsKey = providerArgsKeyRef.current.key;

  // Current render's tracking proxy. Declared before the memo so the stable
  // ref object can be passed to buildTrackedProxy at acquisition time. The
  // proxy trap only reads `.current` at invocation time (not during creation),
  // so it is safe to pass on first mount even though the value is null.
  // Populated during each auto-track render snapshot (below); cleared to null
  // by useLayoutEffect after commit.
  const trackedStateRef = useRef<unknown>(null);

  // ---------------------------------------------------------------------------
  // Per-consumer cross-bloc session.
  //
  // Each render rebuilds a map of every container this consumer is currently
  // interested in. The PRIMARY bloc is the first uniform entry; every dep
  // reached through `this.<handle>.track()` inside a tracked getter adds an
  // entry. The layout-effect reconcile (below) diffs this map vs the previous
  // render to subscribe new deps and release dropped ones. The session lives in
  // this hook's refs only — there is no global ambient state, so sibling
  // renders never cross-contaminate.
  // ---------------------------------------------------------------------------
  const sessionRef = useRef<Map<StateContainer, SessionEntry>>(new Map());
  // Channel subscriptions for DEP containers (the primary keeps its own
  // dedicated effect). container -> { unsubscribe, interestRef, refId held }.
  const depSubsRef = useRef<Map<StateContainer, DepSub>>(new Map());
  // Per-handle wrapper cache, allocated once per bloc acquisition (in the memo)
  // so wrappers are stable across renders. handle -> session-bound wrapper.
  const depWrapperCacheRef = useRef<Map<object, unknown>>(new Map());
  const proxyCacheRef = useRef(new ProxyCache());
  // Snapshot of the last FULL reconcile's shape, used by the layout-effect
  // below to short-circuit when nothing actually changed. `null` means "no
  // prior full run to compare against" (first commit, or the previous commit
  // was in select-mode) — always forces a full reconcile in that case.
  const lastReconcileRef = useRef<ReconcileSignature | null>(null);

  // Rebind nonce: bumped by the ownership layout-effect when the instance the
  // render captured was disposed + recreated out from under us. This happens on
  // a same-commit ownership handoff of a shared (non-keepAlive) key — the sole
  // prior owner's effect cleanup releases refs→0 and SYNCHRONOUSLY disposes the
  // instance before this consumer's layout setup re-acquires (creating a fresh
  // one) — and equivalently under StrictMode's setup→cleanup→setup double-invoke
  // for a lone owner. Threaded into the memo deps so bumping it re-ensures `bloc`
  // against the LIVE registry entry instead of the disposed instance.
  const [rebindNonce, bumpRebind] = useReducer((x: number) => x + 1, 0);
  // The live instance actually owned (ref held) by the ownership layout-effect,
  // read by its cleanup so onUnmount always fires with the owned instance.
  const ownedBlocRef = useRef<TBloc | null>(null);

  const { bloc, instanceKey, trackedBloc } = useMemo<{
    bloc: TBloc;
    instanceKey: string;
    trackedBloc: TBloc;
  }>(() => {
    // Own args win over provider args; provider args win over no args.
    const effectiveArgs =
      ownArgsRef.current !== undefined
        ? ownArgsRef.current
        : providerArgsRef.current;

    const resolvedKey = resolveInstanceKey(BlocClass, effectiveArgs);
    const registry = getRegistry();
    // Render only ENSUREs the instance exists (no ref). Ownership is claimed in
    // the layout effect below, so an abandoned/uncommitted render can never
    // leak a ref and a memo re-run can never double-count one (R3/R4).
    const instance = registry.acquire(BlocClass, resolvedKey, {
      canCreate: true,
      countRef: false,
      args: effectiveArgs,
    }) as TBloc;

    // Build a session-bound wrapper for a dep handle the first time a getter
    // reads it off `this`; cache per handle so the wrapper identity is stable.
    // `onDepHandle` is threaded into each dep's tracked proxy too, so a nested
    // `this.<otherHandle>.track()` inside a dep's getter records into the SAME
    // consumer session — that is what makes deep chains (A→B→C) reactive.
    const onDepHandle = (handle: object): unknown => {
      const cache = depWrapperCacheRef.current;
      const cached = cache.get(handle);
      if (cached !== undefined) return cached;
      const wrapper = makeDepWrapper(
        handle as DepHandleLike,
        consumerId,
        trackedStateRef,
        sessionRef,
        onDepHandle,
      );
      cache.set(handle, wrapper);
      return wrapper;
    };

    const { proxy } = buildTrackedProxy(
      instance as object,
      trackedStateRef,
      onDepHandle,
    );

    return {
      bloc: instance,
      instanceKey: resolvedKey,
      trackedBloc: proxy as TBloc,
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [BlocClass, ownArgsKey, providerArgsKey, rebindNonce]);

  // ---------------------------------------------------------------------------
  // Channel subscription
  //
  // We talk directly to `bloc.channel` — the StructuralContainer's path-scoped
  // DirtyChannel. Subscribing with a dynamic interest function lets us narrow
  // wakeups per consumer, so a component only re-renders when a path it
  // actually read changes (rather than on every state change).
  // ---------------------------------------------------------------------------
  const [, force] = useReducer((x: number) => x + 1, 0);
  const pathRef = useRef<PathSet>(emptyPathSet());
  // Expanded interest: leaf paths PLUS *ancestor-watch* ids for their parents,
  // so that when `patch` atomically replaces a parent (e.g. the array 'items')
  // and the consumer tracked a child (e.g. 'items.length'), the intersection
  // still fires — while a structural pulse-up of a plain-object parent (e.g.
  // 'user' when a sibling 'user.name' changed) does NOT, because pulse-up marks
  // are normal ids and ancestor-watch ids only intersect their own lane.
  // Updated in useLayoutEffect after each render once pathRef.current is
  // populated.
  const expandedInterestRef = useRef<PathSet>(emptyPathSet());
  // For select-mode: cache the last selected array so we can compare against
  // the next one before forcing a re-render.
  const lastSelectionRef = useRef<unknown[] | null>(null);
  // Render-time raw-state snapshot, seeded each render (below) and read by the
  // subscription effect to close the mount gap (R2): an emit landing between the
  // render read and the passive subscribe would otherwise be lost.
  const renderStateRef = useRef<unknown>(undefined);
  // Bloc identity from the previous render, so select-mode can reset its cached
  // selection when the underlying instance changes (re-key).
  const prevBlocRef = useRef<unknown>(null);

  useEffect(() => {
    // Subscribe via the channel directly. For auto-track we re-register the
    // current path interest on each commit (below); for select-mode we use
    // ALL_PATHS and compare selections in the callback.
    //
    // Self-healing note: this effect can run once against a pre-rebind (possibly
    // disposed) `bloc` before the ownership layout-effect's nonce bump triggers a
    // re-render that swaps `bloc` to the live instance (the memo dep array
    // includes `rebindNonce`). That's benign — `channel.subscribe` and
    // `unregisterConsumer` are plain Map operations that don't check disposal
    // state and never throw on a disposed container — so this effect's cleanup
    // runs cleanly and the re-render re-subscribes against the live instance.
    const channel = (bloc as unknown as StateContainer).channel;
    const isSelectMode = selectRef.current !== undefined;

    if (isSelectMode) {
      const unsub = channel.subscribe(
        () => ALL_PATHS,
        () => {
          const select = selectRef.current;
          if (!select) {
            force();
            return;
          }
          const next = select(
            (bloc as unknown as StateContainer).state as ExtractState<T>,
            bloc as InstanceState<T>,
          );
          const prev = lastSelectionRef.current;
          if (prev !== null && shallowArrayEqual(prev, next)) return;
          lastSelectionRef.current = next;
          force();
        },
      );
      // Close the mount gap (R2): an emit between the render's selector seed and
      // this subscribe would be lost. Recompute against LIVE state and force if
      // the selection advanced.
      const select = selectRef.current;
      if (select) {
        const next = select(
          (bloc as unknown as StateContainer).state as ExtractState<T>,
          bloc as InstanceState<T>,
        );
        const prev = lastSelectionRef.current;
        if (prev === null || !shallowArrayEqual(prev, next)) {
          lastSelectionRef.current = next;
          force();
        }
      }
      return unsub;
    }

    // Auto-track mode: subscribe with the expanded interest (leaf paths + their
    // ancestors). This ensures that when `patch` marks a parent path (e.g.
    // 'items') and the consumer tracked a child (e.g. 'items.length'), the
    // channel intersection still fires a re-render.
    //
    // `expandedInterestRef.current` is updated by the useLayoutEffect below
    // after each render, so the interest is always fresh at flush time.
    const unsub = channel.subscribe(
      () => expandedInterestRef.current,
      () => force(),
    );
    // Register the consumer's leaf paths with the container for skeleton
    // recomputation, so the source-side diff can skip us when our paths don't
    // intersect the change.
    (bloc as unknown as StateContainer).registerConsumerPaths(
      consumerId,
      pathRef.current,
    );
    // Close the mount gap (R2): if the container's state advanced between the
    // render snapshot (renderStateRef) and this subscribe, the emit was lost —
    // force one re-render so we don't stay stale.
    if ((bloc as unknown as StateContainer).state !== renderStateRef.current) {
      force();
    }
    return () => {
      unsub();
      (bloc as unknown as StateContainer).unregisterConsumer(consumerId);
    };
  }, [bloc, consumerId]);

  // ---------------------------------------------------------------------------
  // Ownership + mount / unmount lifecycle.
  //
  // The ownership ref is claimed HERE (a layout effect), not in the render/memo,
  // so acquire and release are perfectly paired: a memo re-run can no longer
  // double-count (R3) and an uncommitted render can no longer leak (R4). Keyed
  // on [BlocClass, instanceKey, consumerId] — NOT `bloc` — so a genuine re-key
  // (args change, OR a BlocClass swap) releases the old ref and acquires the new
  // one, while a pure rebind (same class+key, instance replaced under us) does
  // NOT re-run this effect and therefore never releases the single ref we just
  // took (which, for a sole owner, would synchronously dispose the
  // freshly-created instance and churn indefinitely).
  //
  // `BlocClass` MUST stay in the dep array even though `instanceKey` alone often
  // determines identity: `resolveInstanceKey`/`resolveKey` collapse to the same
  // `DEFAULT_STRUCTURAL_KEY` sentinel across DIFFERENT classes when neither has
  // args nor a `static key` (e.g. `useBloc(cond ? AdminBloc : UserBloc)`). Without
  // `BlocClass` here, swapping classes at that shared key would never re-run this
  // effect: the old class's ref would leak until unmount, and the new class's
  // instance (only `ensure`d by the render memo, countRef:false) would be held
  // with zero ownership refs — exposed to disposal by unrelated traffic on that
  // class+key, with no rebind path to recover it.
  //
  // `acquire` returns the authoritative LIVE instance for the key. If it differs
  // from the instance the render captured (`bloc`), the render read a disposed /
  // replaced instance (same-commit shared-key handoff, or StrictMode remount);
  // we bump the rebind nonce so the memo re-ensures `bloc` against this live one.
  // onMount/onUnmount fire with the owned live instance and stay co-located with
  // acquire/release so onUnmount(bloc) runs BEFORE release(...) within one
  // cleanup, keeping the instance alive while the callback runs.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    const registry = getRegistry();
    const live = registry.acquire(BlocClass, instanceKey, {
      canCreate: true,
      countRef: true,
      refId: primaryRefId(consumerId),
    }) as TBloc;
    ownedBlocRef.current = live;
    onMountRef.current?.(live as InstanceType<T>);
    // Rebind if the render captured a stale (disposed/replaced) instance so the
    // component renders + subscribes against the live registry entry, not a
    // disposed one. Only bumps on an actual mismatch, so it can fire at most once
    // per handoff and never loops (the re-ensured `bloc` equals `live`, and this
    // effect is not keyed on `bloc` so it won't re-run and re-release).
    if (live !== bloc) {
      bumpRebind();
    }
    return () => {
      onUnmountRef.current?.((ownedBlocRef.current ?? bloc) as InstanceType<T>);
      registry.release(
        BlocClass,
        instanceKey,
        false,
        primaryRefId(consumerId),
      );
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [BlocClass, instanceKey, consumerId]);

  // ---------------------------------------------------------------------------
  // Snapshot
  //
  // - Auto-track: wrap state in trackRender, record paths into pathRef, and
  //   re-register with the container so the skeleton picks up new interest.
  // - Select-mode: return state directly; the subscription callback compares
  //   selections to decide whether to re-render.
  // ---------------------------------------------------------------------------
  const rawState = (bloc as unknown as StateContainer).state as ExtractState<T>;
  // Seed the render-time snapshot so the subscription effect can detect an emit
  // that landed in the render→subscribe window (R2 mount gap).
  renderStateRef.current = rawState;
  // Reset the cached selection when the bloc identity changes (re-key) so the
  // select seed below re-seeds against the NEW instance instead of comparing
  // against a stale selection from the previous instance.
  if (prevBlocRef.current !== bloc) {
    prevBlocRef.current = bloc;
    lastSelectionRef.current = null;
  }
  let state: ExtractState<T>;
  if (selectRef.current !== undefined) {
    state = rawState;
    // Seed the last selection on the first render so we don't fire an
    // immediate "different from null" wakeup on the first emit.
    if (lastSelectionRef.current === null) {
      lastSelectionRef.current = selectRef.current(
        rawState,
        bloc as InstanceState<T>,
      );
    }
  } else {
    const tracked = trackRender(
      rawState,
      (bloc as unknown as StateContainer).interner,
      proxyCacheRef.current,
    );
    state = tracked.value as ExtractState<T>;
    trackedStateRef.current = tracked.value;
    pathRef.current = tracked.paths;
    // Rebuild the per-consumer session for this render. The primary bloc is the
    // first uniform entry; its `paths` are the SAME PathSet object the proxy
    // mutates during JSX (so it stays live as getters record leaves). Dep
    // entries are appended during JSX as `this.<handle>.track()` runs. Cleared
    // here (not in the layout effect) so a render that no longer tracks a dep
    // produces a session without it, and the reconcile drops it.
    const session = sessionRef.current;
    session.clear();
    session.set(bloc as unknown as StateContainer, {
      kind: 'primary',
      paths: tracked.paths,
    });
    // Freeze this render's tracking proxy after the synchronous render+commit
    // pass. The microtask fires only once the current task unwinds, so all
    // render-time JSX reads still record; reads afterwards — effects, event
    // handlers, async callbacks, devtools inspecting `state` — hit the
    // disarmed proxy and record nothing, so this render's path set can't be
    // polluted by work that outlives the render that owns it.
    queueMicrotask(tracked.disarm);
    // NOTE: registerConsumerPaths is intentionally NOT called here. The
    // proxy hasn't been accessed yet, so `tracked.paths` is an empty Set
    // that the proxy will mutate during JSX evaluation. Registering at
    // this point would store an empty interest with the container and
    // freeze the skeleton at that snapshot — subsequent emits would
    // diff against an empty skeleton and silently drop wakeups. The
    // useLayoutEffect below registers the populated set after render.
  }

  // After the render commits, pathRef.current is the consumer's actual leaf
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
    trackedStateRef.current = null;
    if (selectRef.current !== undefined) {
      // Switching into (or staying in) select-mode: invalidate any prior full
      // reconcile so a later switch back to auto-track mode never mistakes a
      // stale signature for "unchanged" and skips a needed reconcile.
      lastReconcileRef.current = null;
      return;
    }
    const container = bloc as unknown as StateContainer;
    const paths = pathRef.current;
    const session = sessionRef.current;

    // ---------------------------------------------------------------------
    // Short-circuit: if the primary path set AND the full dep session are
    // set-equal (paths + key/refId/args) to the last FULL reconcile, none of
    // registerConsumerPaths/subscribe/unsubscribe/expandWithAncestors below
    // can have anything new to do — skip the whole block. Any mismatch, or
    // `lastReconcileRef.current === null` (first commit, or the immediately
    // preceding commit was select-mode / uncertain), falls through to the
    // full reconcile. Never skip on uncertainty — a missed re-subscribe would
    // leave a stale/dropped subscription.
    // ---------------------------------------------------------------------
    const last = lastReconcileRef.current;
    if (
      last !== null &&
      last.primaryContainer === container &&
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

    container.registerConsumerPaths(consumerId, paths);
    // Register the *normal* leaf paths above for the source-side skeleton, then
    // build the channel interest as leaves + ancestor-watch ids so that an
    // atomic `patch` replacement of a parent (e.g. the array 'items') wakes a
    // consumer that tracked a child (e.g. 'items.length').
    expandedInterestRef.current = expandWithAncestors(
      paths,
      container.interner,
    );

    // -----------------------------------------------------------------------
    // Reconcile DEP containers (cross-bloc `.track()` interest).
    //
    // The primary bloc keeps its own dedicated subscription effect above; this
    // block manages only the *dep* containers recorded in the session this
    // render. We diff the new dep set vs the previously-subscribed set:
    //   - new dep      -> acquire was already done in `.track()`; subscribe its
    //                     channel + registerConsumerPaths + seed interest.
    //   - surviving    -> refresh its interest ref (subscribe closure reads it).
    //   - dropped      -> unsubscribe, unregisterConsumer, and release its ref.
    // -----------------------------------------------------------------------
    const subs = depSubsRef.current;

    // Pass 1: drop containers no longer in the session.
    for (const [depContainer, sub] of subs) {
      if (!session.has(depContainer)) {
        sub.unsubscribe();
        depContainer.unregisterConsumer(consumerId);
        getRegistry().release(sub.Type, sub.key, false, sub.refId);
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
      getRegistry().acquire(entry.Type, entry.key, {
        canCreate: true,
        countRef: true,
        refId: entry.refId,
        args: entry.args,
      });
      const interestRef: { current: PathSet } = { current: interest };
      const unsubscribe = depContainer.channel.subscribe(
        () => interestRef.current,
        () => force(),
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
    lastReconcileRef.current = {
      primaryContainer: container,
      primaryPaths: paths,
      deps: depsSignature,
    };
  });

  // Unmount: tear down every dep subscription + ref exactly once. Kept in its
  // own effect (consumerId is stable for the component's lifetime, so this only
  // runs on final unmount, not on every reconcile). depSubsRef is mutated in
  // place by the reconcile, so the captured Map reference still holds the live
  // set at unmount.
  useEffect(() => {
    // Capture the ref's Map (mutated in place across renders) so the cleanup
    // reads the captured reference rather than depSubsRef.current directly.
    const subs = depSubsRef.current;
    return () => {
      for (const [depContainer, sub] of subs) {
        sub.unsubscribe();
        depContainer.unregisterConsumer(consumerId);
        getRegistry().release(sub.Type, sub.key, false, sub.refId);
      }
      subs.clear();
    };
  }, [consumerId]);

  return [
    state,
    trackedBloc,
    componentRef as RefObject<ComponentRef>,
  ] as UseBlocReturn<T, ExtractState<T>>;
}

// ---------------------------------------------------------------------------
// Cross-bloc session types + dep-handle wrapper.
// ---------------------------------------------------------------------------

/**
 * One entry in a consumer's per-render session map. Discriminated on `kind`:
 * the primary bloc is managed by its own dedicated effect, while dep entries
 * carry the registry coordinates the reconcile needs to release their ref.
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
 * can short-circuit (see `lastReconcileRef` in `useBloc`).
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
 * - **Inside a render** (`trackedStateRef.current != null`): resolve (ENSURE,
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
  consumerId: string,
  trackedStateRef: { current: unknown },
  sessionRef: { current: Map<StateContainer, SessionEntry> },
  onDepHandle: (handle: object) => unknown,
): DepHandleLike {
  const brand = handle[DEP_BRAND];
  const refId = depRefId(consumerId);
  const registry = getRegistry();
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
      if (trackedStateRef.current == null) {
        return [dep.state, dep];
      }

      const session = sessionRef.current;
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
 * (`internAncestor`), NOT as normal ids. The source emits a matching
 * ancestor-watch mark only for paths it replaces atomically — never for a
 * plain-object structural pulse-up. So `{'items.length'}` wakes when the array
 * `items` is replaced, but `{'user.email'}` does NOT wake when a sibling
 * `user.name` changes and pulses `user` up: pulse-up `user` is a normal id and
 * the ancestor-watch `user` only intersects another ancestor-watch `user`.
 *
 * Example: leaf `'a.b.c'` adds ancestor-watch ids for `'a.b'` and `'a'` (but
 * NOT the `''` root — a root change is covered by `ALL_PATHS` from the source,
 * and `''` would wake this consumer on every field change).
 */
function expandWithAncestors(paths: PathSet, interner: PathInterner): PathSet {
  if (paths === ALL_PATHS) return ALL_PATHS;
  const leafPaths = paths as Set<number>;
  if (leafPaths.size === 0) return paths;

  const expanded = new Set<number>(leafPaths);
  for (const id of leafPaths) {
    const str = interner.lookup(id);
    // Add all non-root ancestor segments as *ancestor-watch* ids: 'a.b.c' →
    // watch 'a.b' and 'a'. These live in the interner's ancestor lane so they
    // only intersect the source's atomic-replacement marks (`internAncestor`),
    // never a structural pulse-up mark of the same path. That is what lets a
    // descendant-reader (e.g. `items.length`) wake on an array/null replacement
    // without a sibling-leaf reader (`user.email`) waking when a sibling
    // (`user.name`) changes and pulses up through `user`.
    let idx = str.lastIndexOf('.');
    while (idx > 0) {
      const ancestor = str.slice(0, idx);
      expanded.add(interner.internAncestor(ancestor));
      idx = ancestor.lastIndexOf('.');
    }
  }
  return expanded;
}
