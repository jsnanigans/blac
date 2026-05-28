import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  type RefObject,
} from 'react';
import {
  acquire,
  release,
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
  type PathSet,
} from '@dirtytalk/structural';
import { useInstanceIdFromContext } from './BlocProvider';
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
 *   unmount. The instance key is the explicit `options.instanceId`, then
 *   the surrounding {@link BlocProvider} context, then the default key.
 * - `options.onMount` fires after the bloc is acquired; `options.onUnmount`
 *   fires *before* the registry releases its ref, so the bloc is still
 *   alive when the callback runs.
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
 * @example Named instance
 * ```ts
 * const [state, bloc] = useBloc(MyBloc, { instanceId: 'cart-42' });
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
  // Args are user-supplied; callers commonly pass a fresh object literal each
  // render. Memoising on `args` directly would bust every render. We compute a
  // structural key (JSON.stringify) for the useMemo dep instead — undefined
  // args (void-args blocs) collapse to an undefined key.
  // ---------------------------------------------------------------------------
  const args = (options as { args?: ExtractArgs<T> } | undefined)?.args;
  const argsRef = useRef(args);
  argsRef.current = args;
  const argsKey = args === undefined ? undefined : JSON.stringify(args);

  const explicitInstanceId = options?.instanceId;
  const ctxInstanceId = useInstanceIdFromContext();

  const { bloc, instanceKey } = useMemo<{
    bloc: TBloc;
    instanceKey: string;
  }>(() => {
    const explicitKey =
      explicitInstanceId !== undefined
        ? String(explicitInstanceId)
        : ctxInstanceId;
    const resolvedKey = resolveInstanceKey(
      BlocClass,
      explicitKey,
      argsRef.current,
    );
    const refId = `useBloc@${consumerId}`;
    const instance = acquire(
      BlocClass,
      resolvedKey,
      refId,
      argsRef.current,
    ) as TBloc;
    return { bloc: instance, instanceKey: resolvedKey };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [BlocClass, explicitInstanceId, ctxInstanceId, argsKey]);

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

    // Auto-track mode: wake on any change that intersects the recorded paths.
    // `() => pathRef.current` is called by the channel on every flush, so we
    // always see the latest interest without re-subscribing.
    const unsub = channel.subscribe(
      () => pathRef.current,
      () => force(),
    );
    // Also register the consumer paths with the container for skeleton
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
      release(BlocClass, instanceKey, false, refId);
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
    pathRef.current = tracked.paths;
    // Sync interest with the container on every render so source-side diff
    // can skip-when-disjoint as soon as the consumer narrows.
    (bloc as unknown as StateContainer).registerConsumerPaths(
      consumerId,
      tracked.paths,
    );
  }

  return [
    state,
    bloc,
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
