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
import type { ComponentRef, UseBlocOptions, UseBlocReturn } from './types';

let nextConsumerId = 0;

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
    const refId = `useBloc@${consumerId}`;
    const registry = getRegistry();
    const instance = registry.acquire(BlocClass, resolvedKey, {
      canCreate: true,
      countRef: true,
      refId,
      args: effectiveArgs,
    }) as TBloc;

    // Build a map of getter descriptors from the prototype chain (excluding
    // Object.prototype). This is computed once per bloc acquisition so that
    // the proxy's get trap is O(1) per property access. Both string- and
    // symbol-keyed getters are collected. Arrow-function class properties
    // (own, bound in the constructor) are not getters and pass through
    // unmodified.
    const getterDescs = new Map<string | symbol, PropertyDescriptor>();
    let proto = Object.getPrototypeOf(instance);
    while (proto && proto !== Object.prototype) {
      const keys: (string | symbol)[] = [
        ...Object.getOwnPropertyNames(proto),
        ...Object.getOwnPropertySymbols(proto),
      ];
      for (const key of keys) {
        const desc = Object.getOwnPropertyDescriptor(proto, key);
        if (desc?.get && !getterDescs.has(key)) getterDescs.set(key, desc);
      }
      proto = Object.getPrototypeOf(proto);
    }

    // `this`-proxy for getter invocations, allocated ONCE per acquisition (the
    // trap closes over the stable `trackedStateRef`, so it never needs to be
    // rebuilt per access). Redirects `this.state` to the current render's
    // tracking proxy so getter reads during JSX record paths; outside render
    // `trackedStateRef.current` is null and it falls through to live state.
    // The receiver `r` (this proxy) is threaded through Reflect.get so chained
    // getter calls (getters reading other getters) stay in tracked context.
    const thisProxy = new Proxy(instance as object, {
      get(t, k, r) {
        if (k === 'state')
          return trackedStateRef.current ?? Reflect.get(t, k, r);
        return Reflect.get(t, k, r);
      },
    });

    // Stable proxy: one allocation per bloc acquisition. Non-getter access is
    // a single Map lookup + Reflect.get — no prototype walk on the hot path.
    const proxy = new Proxy(instance as object, {
      get(target, key, receiver) {
        const desc = getterDescs.get(key);
        if (desc?.get) return desc.get.call(thisProxy);
        return Reflect.get(target, key, receiver);
      },
    }) as TBloc;

    return { bloc: instance, instanceKey: resolvedKey, trackedBloc: proxy };
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
  // Current render's tracking proxy. Updated during each auto-track render so
  // the stable getter-proxy on `trackedBloc` sees the right context when a
  // getter is called during JSX evaluation.
  const trackedStateRef = useRef<unknown>(null);

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
      const refId = `useBloc@${consumerId}`;
      getRegistry().release(BlocClass, instanceKey, false, refId);
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
  });

  return [
    state,
    trackedBloc,
    componentRef as RefObject<ComponentRef>,
  ] as UseBlocReturn<T, ExtractState<T>>;
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
