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
  trackRender,
  PathInterner,
  type PathSet,
} from '@dirtytalk/structural';
import { useProvidedArgs } from './BlocProvider';
import { buildTrackedProxy } from './buildTrackedProxy';
import type { ComponentRef, UseBlocOptions, UseBlocReturn } from './types';

let nextConsumerId = 0;

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
 *   (per-index `Object.is`). This replaces the v1 `dependencies` option.
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
 * @example Manual select (replaces v1 `dependencies`)
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
  const ownArgsKey =
    ownArgs === undefined ? undefined : JSON.stringify(ownArgs);

  // Read provided args from the nearest BlocProvider for this bloc class.
  const providerArgs = useProvidedArgs(BlocClass);
  const providerArgsRef = useRef(providerArgs);
  providerArgsRef.current = providerArgs;
  const providerArgsKey =
    providerArgs === undefined ? undefined : JSON.stringify(providerArgs);

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
    const refId = primaryRefId(consumerId);
    const registry = getRegistry();
    const instance = registry.acquire(BlocClass, resolvedKey, {
      canCreate: true,
      countRef: true,
      refId,
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
        depSubsRef,
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
  }, [BlocClass, ownArgsKey, providerArgsKey]);

  // ---------------------------------------------------------------------------
  // Channel subscription
  //
  // We bypass `bloc.subscribe(listener)` (the legacy listener surface, which
  // StateContainer overrides) and talk directly to `bloc.channel`. The channel
  // is the StructuralContainer's path-scoped DirtyChannel; subscribing with a
  // dynamic interest function lets us narrow wakeups per consumer.
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

  useEffect(() => {
    // Subscribe via the channel directly. For auto-track we re-register the
    // current path interest on each commit (below); for select-mode we use
    // ALL_PATHS and compare selections in the callback.
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
    return () => {
      unsub();
      (bloc as unknown as StateContainer).unregisterConsumer(consumerId);
    };
  }, [bloc, consumerId]);

  // ---------------------------------------------------------------------------
  // Mount / unmount lifecycle.
  //
  // Order on unmount: onUnmount(bloc) -> release(...). The bloc must still be
  // alive when onUnmount runs (release may dispose it).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    onMountRef.current?.(bloc as InstanceType<T>);
    return () => {
      onUnmountRef.current?.(bloc as InstanceType<T>);
      getRegistry().release(
        BlocClass,
        instanceKey,
        false,
        primaryRefId(consumerId),
      );
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [bloc, instanceKey]);

  // ---------------------------------------------------------------------------
  // Snapshot
  //
  // - Auto-track: wrap state in trackRender, record paths into pathRef, and
  //   re-register with the container so the skeleton picks up new interest.
  // - Select-mode: return state directly; the subscription callback compares
  //   selections to decide whether to re-render.
  // ---------------------------------------------------------------------------
  const rawState = (bloc as unknown as StateContainer).state as ExtractState<T>;
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
    if (selectRef.current !== undefined) return;
    const container = bloc as unknown as StateContainer;
    const paths = pathRef.current;
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
    const session = sessionRef.current;

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
      });
    }
  });

  // Unmount: tear down every dep subscription + ref exactly once. Kept in its
  // own effect (empty deps) so it only runs on final unmount, not on every
  // reconcile. depSubsRef is mutated in place by the reconcile, so reading it
  // here at unmount yields the live set.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      const subs = depSubsRef.current;
      for (const [depContainer, sub] of subs) {
        sub.unsubscribe();
        depContainer.unregisterConsumer(consumerId);
        getRegistry().release(sub.Type, sub.key, false, sub.refId);
      }
      subs.clear();
    };
  }, []);

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
    };

/** A live dep-channel subscription tracked between renders for reconciliation. */
interface DepSub {
  unsubscribe: () => void;
  interestRef: { current: PathSet };
  Type: StateContainerConstructor;
  key: string;
  refId: string;
}

/** Structural shape of a branded `depend()` handle as seen from React. */
interface DepHandleLike {
  (): StateContainer;
  track(): [unknown, StateContainer];
  readonly [DEP_BRAND]: {
    Type: StateContainerConstructor;
    key: string;
    args?: unknown;
  };
}

/**
 * Build the per-consumer wrapper that replaces a branded dep handle inside a
 * tracked getter's `this`. The wrapper is itself callable (delegates to the
 * original handle for back-compat) and overrides `.track()`:
 *
 * - **Inside a render** (`trackedStateRef.current != null`): resolve the dep,
 *   take a refcount (once per consumer), `trackRender` its state, merge the
 *   recorded paths into the session entry, build/reuse a tracked proxy for the
 *   dep so its OWN getters track too, and return `[trackedValue, depProxy]`.
 * - **Outside a render**: degrade to live `[dep.state, dep]` — matches the core
 *   base impl, safe in event handlers/effects/methods.
 *
 * Guards against a container re-entering tracking within the same render
 * (mutual A↔B deps): if the dep already has a non-primary session entry this
 * render, reuse its proxy + union its paths instead of re-acquiring.
 */
function makeDepWrapper(
  handle: DepHandleLike,
  consumerId: string,
  trackedStateRef: { current: unknown },
  sessionRef: { current: Map<StateContainer, SessionEntry> },
  depSubsRef: { current: Map<StateContainer, DepSub> },
  onDepHandle: (handle: object) => unknown,
): DepHandleLike {
  const brand = handle[DEP_BRAND];
  const refId = depRefId(consumerId);
  // Stable per-handle tracked-state ref + proxy lazily built on first track.
  const depTrackedStateRef = { current: null as unknown };
  let depProxy: StateContainer | null = null;

  const wrapper = (() => handle()) as DepHandleLike;

  (wrapper as { track: () => [unknown, StateContainer] }).track = () => {
    const registry = getRegistry();
    const dep = registry.ensure(
      brand.Type,
      brand.key,
      brand.args,
    ) as unknown as StateContainer;

    // Outside a render: live values, no subscription (core base behavior).
    if (trackedStateRef.current == null) {
      return [dep.state, dep];
    }

    const session = sessionRef.current;
    const existing = session.get(dep);

    // Take a refcount the FIRST time this dep is tracked, held across renders
    // and released by the reconcile (on drop) or unmount. The session map is
    // rebuilt every render, so it can't tell us whether we already hold a ref;
    // `depSubsRef` does — it persists across renders and is populated by the
    // reconcile after the first tracking render. If neither the (cleared) per-
    // render session nor the persistent sub set knows this dep, acquire once.
    // React runs the layout-effect reconcile before the next render, so the
    // sub is registered before a subsequent track sees it → no double-acquire.
    if (existing === undefined && !depSubsRef.current.has(dep)) {
      registry.acquire(brand.Type, brand.key, {
        canCreate: true,
        countRef: true,
        refId,
        args: brand.args,
      });
    }

    const tracked = trackRender(dep.state, dep.interner);
    depTrackedStateRef.current = tracked.value;
    if (depProxy === null) {
      depProxy = buildTrackedProxy(dep, depTrackedStateRef, onDepHandle).proxy;
    }

    if (existing !== undefined) {
      // Re-entry this render (e.g. `.track()` called twice, or a mutual cycle):
      // union the new paths into the existing entry rather than re-acquiring.
      existing.paths = unionPaths(existing.paths, tracked.paths);
    } else {
      session.set(dep, {
        kind: 'dep',
        paths: tracked.paths,
        Type: brand.Type,
        key: brand.key,
        refId,
      });
    }

    return [tracked.value, depProxy];
  };

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
