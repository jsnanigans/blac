import React, {
  useMemo,
  useSyncExternalStore,
  useEffect,
  useRef,
  useReducer,
} from 'react';
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
import { useInstanceIdFromContext } from './BlocProvider';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';
import { getBlacReactConfig } from './config';

let nextConsumerId = 0;

function getComponentName(): string | undefined {
  try {
    const internals =
      (React as any)
        .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const owner = internals?.ReactCurrentOwner?.current;
    if (owner?.type) {
      return owner.type.displayName || owner.type.name || undefined;
    }
  } catch {
    // ignore — React internals may not be available
  }
  return undefined;
}

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
  const globalConfig = getBlacReactConfig();
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
 * React hook that connects a component to a state container with automatic re-render on state changes.
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

  // Capture component name from React fiber during render (for devtools consumer tracking)
  const consumerIdRef = useRef<string | null>(null);
  if (consumerIdRef.current === null) {
    consumerIdRef.current = String(nextConsumerId++);
  }
  const componentNameRef = useRef<string | null>(null);
  if (componentNameRef.current === null) {
    componentNameRef.current = getComponentName() || null;
  }

  const selectRef = useRef(options?.select);
  selectRef.current = options?.select;
  const onMountRef = useRef(options?.onMount);
  onMountRef.current = options?.onMount;
  const onUnmountRef = useRef(options?.onUnmount);
  onUnmountRef.current = options?.onUnmount;
  // Per-consumer deps slice, read by the commit effect so it always merges the
  // latest ref/callback identities without re-resolving the instance.
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
  const autoInstanceId = React.useId();
  const autoInstance =
    options?.autoInstance === true || isIsolatedClass(BlocClass);
  // Resolve `instanceId` from a surrounding <BlocProvider> when not given
  // explicitly and not auto-keyed.
  const ctxInstanceId = useInstanceIdFromContext();

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
            : ctxInstanceId;

      const refId = `useBloc@${componentNameRef.current ?? 'Unknown'}-${consumerIdRef.current}`;
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

      return [
        adapterState.proxiedBloc as TBloc,
        subscribeFn,
        getSnapshotFn,
        instanceKey,
        adapterState,
        instance,
      ];
      // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [BlocClass, instanceId, autoInstance, autoInstanceId, ctxInstanceId, argsKey]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const externalDepsManager = useRef<ExternalDepsManager>(null);
  if (externalDepsManager.current === null) {
    (
      externalDepsManager as React.MutableRefObject<ExternalDepsManager>
    ).current = new ExternalDepsManager();
  }

  // Run on every commit: commit the per-render getter accesses into the
  // authoritative `trackedGetters` set, and re-sync external-bloc subscriptions
  // so dynamically-added/removed cross-bloc deps re-establish listeners.
  // No dep array — both operations are idempotent / guarded internally.
  useEffect(() => {
    const manager = externalDepsManager.current!;
    disableGetterTracking(adapterState);
    manager.updateSubscriptions(
      adapterState.getterState,
      rawInstance,
      forceUpdate,
    );
    // Merge this consumer's deps slice into the un-proxied instance. The core
    // engine shallow-diffs per owner, so re-applying an identical slice (e.g.
    // StrictMode double-commit) is a no-op; changed ref/callback identities are
    // picked up because we read the latest slice from a ref each commit.
    (rawInstance as any)[APPLY_DEPS](
      consumerIdRef.current,
      (depsSliceRef.current ?? {}) as Partial<ExtractDeps<T>>,
    );
  });

  useEffect(() => {
    const manager = externalDepsManager.current!;
    const currentInstanceKey = instanceKey;
    const currentRawInstance = rawInstance;
    const currentBloc = bloc;

    // Register as consumer in devtools (if available)
    const devtools =
      typeof window !== 'undefined'
        ? (window as any).__BLAC_DEVTOOLS__
        : undefined;
    if (devtools?.registerConsumer && currentRawInstance) {
      devtools.registerConsumer(
        (currentRawInstance as any).instanceId,
        consumerIdRef.current,
        componentNameRef.current || 'Unknown',
      );
    }

    onMountRef.current?.(currentBloc as InstanceType<T>);

    return () => {
      if (devtools?.unregisterConsumer && currentRawInstance) {
        devtools.unregisterConsumer(
          (currentRawInstance as any).instanceId,
          consumerIdRef.current,
        );
      }

      manager.cleanup();

      // Withdraw this consumer's deps slice while the instance is still alive,
      // so onDepsChanged can fire teardown before release. Removing an absent
      // owner is a no-op (StrictMode double-cleanup safe).
      (currentRawInstance as any)?.[REMOVE_DEPS_OWNER](consumerIdRef.current);

      onUnmountRef.current?.(currentBloc as InstanceType<T>);

      const refId = `useBloc@${componentNameRef.current ?? 'Unknown'}-${consumerIdRef.current}`;
      release(BlocClass, currentInstanceKey, false, refId);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [bloc, instanceKey, rawInstance]);

  return [state, bloc, componentRef] as UseBlocReturn<T, ExtractState<T>>;
}
