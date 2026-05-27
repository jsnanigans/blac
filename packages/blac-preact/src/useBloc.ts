import {
  useMemo,
  useEffect,
  useRef,
  useReducer,
  useId,
} from 'preact/hooks';
import { useSyncExternalStore } from 'preact/compat';
import {
  type ExtractArgs,
  type ExtractState,
  type AdapterState,
  ExternalDepsManager,
  autoTrackSubscribe,
  manualDepsSubscribe,
  noTrackSubscribe,
  autoTrackSnapshot,
  manualDepsSnapshot,
  noTrackSnapshot,
  autoTrackInit,
  manualDepsInit,
  noTrackInit,
  disableGetterTracking,
  type StateContainerConstructor,
  type InstanceState,
  type ExtractDeps,
  acquire,
  release,
  APPLY_DEPS,
  REMOVE_DEPS_OWNER,
} from '@blac/adapter';
import { isIsolatedClass } from '@blac/core';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';
import { getBlacPreactConfig } from './config';

let nextConsumerId = 0;

interface TrackingMode {
  useManualDeps: boolean;
  autoTrackEnabled: boolean;
}

/** Known valid option keys for useBloc — used for the dev-only unknown-key warning. */
const KNOWN_OPTION_KEYS = new Set([
  'instanceId',
  'autoInstance',
  'select',
  'autoTrack',
  'onMount',
  'onUnmount',
  'args',
  'deps',
]);

function determineTrackingMode(
  options?: {
    autoTrack?: boolean;
    select?: (...args: any[]) => unknown[];
  },
): TrackingMode {
  const globalConfig = getBlacPreactConfig();
  const autoTrackEnabled =
    options?.autoTrack !== undefined
      ? options.autoTrack
      : globalConfig.autoTrack;

  return {
    useManualDeps: options?.select !== undefined,
    autoTrackEnabled,
  };
}

/**
 * Preact hook that connects a component to a state container with automatic re-render on state changes.
 *
 * Supports three tracking modes:
 * - **Auto-tracking** (default): Automatically detects accessed state properties via Proxy
 * - **Manual dependencies**: Explicit dependency array like useEffect
 * - **No tracking**: Returns full state without optimization
 *
 * @template T - The state container constructor type (inferred from BlocClass)
 * @param BlocClass - The state container class to connect to
 * @param options - Configuration options for tracking mode and instance management
 * @returns Tuple with [state, bloc instance, ref]
 *
 * @example Basic usage
 * ```ts
 * const [state, myBloc, ref] = useBloc(MyBloc);
 * ```
 *
 * @example With manual select (re-render selector)
 * ```ts
 * const [state, myBloc] = useBloc(MyBloc, {
 *   select: (state) => [state.count]
 * });
 * ```
 *
 * @example With named instance
 * ```ts
 * const [state, myBloc] = useBloc(MyBloc, {
 *   instanceId: 'unique-id'
 * });
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

  // Stable per-consumer ID for the deps merge engine (does not re-render the
  // component; outlives any instance churn; keyed within the registry).
  const consumerIdRef = useRef<string | null>(null);
  if (consumerIdRef.current === null) {
    consumerIdRef.current = String(nextConsumerId++);
  }

  const selectRef = useRef(options?.select);
  selectRef.current = options?.select;
  const onMountRef = useRef(options?.onMount);
  onMountRef.current = options?.onMount;
  const onUnmountRef = useRef(options?.onUnmount);
  onUnmountRef.current = options?.onUnmount;
  // Per-consumer deps slice — always up to date for the commit effect.
  const depsSliceRef = useRef(options?.deps);
  depsSliceRef.current = options?.deps;
  const instanceId = options?.instanceId;
  const autoTrack = options?.autoTrack;
  const select = options?.select;

  // Dev-only: warn on unknown option keys (catches v1-isms and typos).
  if (process.env.NODE_ENV !== 'production' && options != null) {
    const unknownKeys = Object.keys(options).filter(
      (k) => !KNOWN_OPTION_KEYS.has(k),
    );
    if (unknownKeys.length > 0) {
      console.warn(
        `[useBloc] Unknown option key(s): ${unknownKeys.join(', ')}. ` +
          `Known keys: ${[...KNOWN_OPTION_KEYS].join(', ')}.`,
      );
    }
  }

  // Stable structural key for args so that different args → different instance
  // resolution, without re-running the useMemo on every render due to object
  // reference churn. undefined args (void-args blocs) produce an undefined key.
  const args = (options as { args?: ExtractArgs<T> })?.args;
  const argsRef = useRef(args);
  argsRef.current = args;
  const argsKey =
    args === undefined ? undefined : JSON.stringify(args);

  // Dev-only: warn when an explicit instanceId and args-derived key disagree.
  // The explicit instanceId wins, but this is almost always a mistake.
  if (
    process.env.NODE_ENV !== 'production' &&
    instanceId !== undefined &&
    argsKey !== undefined &&
    String(instanceId) !== argsKey
  ) {
    console.warn(
      `[useBloc] Explicit instanceId "${String(instanceId)}" and args-derived ` +
        `key "${argsKey}" disagree — the explicit instanceId takes precedence. ` +
        `Either remove instanceId to use args-based identity, or remove args if ` +
        `you are managing the instance key manually.`,
    );
  }

  // Auto-keyed per-mount instance: either declared on the class
  // (`static isolated = true`) or opted into per call (`autoInstance: true`).
  // `useId()` is always called to satisfy the rules of hooks.
  const autoInstanceId = useId();
  const autoInstance =
    options?.autoInstance === true || isIsolatedClass(BlocClass);

  const [bloc, subscribe, getSnapshot, instanceKey, adapterState, rawInstance] =
    useMemo<
      readonly [
        TBloc,
        (callback: () => void) => () => void,
        () => ExtractState<T>,
        string | undefined,
        AdapterState<T>,
        TBloc,
      ]
    >(() => {
      const instanceKey =
        instanceId !== undefined
          ? String(instanceId)
          : autoInstance
            ? autoInstanceId
            : undefined;

      const refId = `useBloc@preact-${consumerIdRef.current}`;
      const instance = acquire(BlocClass, instanceKey, refId, argsRef.current) as TBloc;

      const { useManualDeps, autoTrackEnabled } = determineTrackingMode({
        autoTrack,
        select,
      });

      let subscribeFn: (callback: () => void) => () => void;
      let getSnapshotFn: () => ExtractState<T>;
      let adapterState: AdapterState<T>;

      if (useManualDeps && select) {
        adapterState = manualDepsInit(instance);
        const stableConfig = {
          dependencies: (state: ExtractState<T>, bloc: InstanceState<T>) => {
            const fn = selectRef.current;
            return fn ? fn(state, bloc) : [];
          },
        };
        subscribeFn = manualDepsSubscribe(instance, adapterState, stableConfig);
        getSnapshotFn = manualDepsSnapshot(
          instance,
          adapterState,
          stableConfig,
        );
      } else if (!autoTrackEnabled) {
        adapterState = noTrackInit(instance);
        subscribeFn = noTrackSubscribe(instance);
        getSnapshotFn = noTrackSnapshot(instance);
      } else {
        adapterState = autoTrackInit(instance);
        subscribeFn = autoTrackSubscribe(instance, adapterState);
        getSnapshotFn = autoTrackSnapshot(instance, adapterState);
      }

      const safeSubscribeFn = (callback: () => void) => {
        if (instance.isDisposed) return () => {};
        return subscribeFn(callback);
      };

      return [
        adapterState.proxiedBloc as TBloc,
        safeSubscribeFn,
        getSnapshotFn,
        instanceKey,
        adapterState,
        instance,
      ];
      // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [BlocClass, instanceId, autoInstance, autoInstanceId, argsKey]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const externalDepsManager = useRef(new ExternalDepsManager());

  // Run on every commit: commit the per-render getter accesses into the
  // authoritative `trackedGetters` set, and re-sync external-bloc subscriptions.
  // Also merge this consumer's deps slice into the un-proxied instance.
  useEffect(() => {
    const manager = externalDepsManager.current;
    disableGetterTracking(adapterState);
    manager.updateSubscriptions(adapterState.getterState, rawInstance, () =>
      forceUpdate(0),
    );
    // Merge this consumer's deps slice into the un-proxied instance. The core
    // engine shallow-diffs per owner, so re-applying an identical slice is a
    // no-op; changed ref/callback identities are picked up from the latest ref.
    (rawInstance as any)[APPLY_DEPS](
      consumerIdRef.current,
      (depsSliceRef.current ?? {}) as Partial<ExtractDeps<T>>,
    );
  });

  useEffect(() => {
    const manager = externalDepsManager.current;
    const currentInstanceKey = instanceKey;
    const currentRawInstance = rawInstance;
    const currentBloc = bloc;

    onMountRef.current?.(currentBloc as InstanceType<T>);

    return () => {
      manager.cleanup();

      // Withdraw this consumer's deps slice while the instance is still alive,
      // so onDepsChanged can fire teardown before release.
      (currentRawInstance as any)?.[REMOVE_DEPS_OWNER](consumerIdRef.current);

      onUnmountRef.current?.(currentBloc as InstanceType<T>);

      const refId = `useBloc@preact-${consumerIdRef.current}`;
      release(BlocClass, currentInstanceKey, false, refId);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [bloc, instanceKey, rawInstance]);

  return [state, bloc, componentRef] as UseBlocReturn<T, ExtractState<T>>;
}
