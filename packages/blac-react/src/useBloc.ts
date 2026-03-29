import React, {
  useMemo,
  useSyncExternalStore,
  useEffect,
  useRef,
  useReducer,
} from 'react';
import {
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
  acquire,
  release,
} from '@blac/adapter';
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

function determineTrackingMode<TBloc extends StateContainerConstructor>(
  options?: Pick<UseBlocOptions<TBloc>, 'autoTrack' | 'dependencies'>,
): TrackingMode {
  const globalConfig = getBlacReactConfig();
  const autoTrackEnabled =
    options?.autoTrack !== undefined
      ? options.autoTrack
      : globalConfig.autoTrack;

  return {
    useManualDeps: options?.dependencies !== undefined,
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
 * @example With manual dependencies
 * ```ts
 * const [state, myBloc] = useBloc(MyBloc, {
 *   dependencies: (state) => [state.count]
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

  const depsRef = useRef(options?.dependencies);
  depsRef.current = options?.dependencies;
  const instanceId = options?.instanceId;
  const autoTrack = options?.autoTrack;
  const dependencies = options?.dependencies;

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
        instanceId !== undefined ? String(instanceId) : undefined;

      const instance = acquire(BlocClass, instanceKey) as TBloc;

      const { useManualDeps, autoTrackEnabled } = determineTrackingMode({
        autoTrack,
        dependencies,
      });

      let subscribeFn: (callback: () => void) => () => void;
      let getSnapshotFn: () => ExtractState<T>;
      let adapterState: AdapterState<T>;

      if (useManualDeps && dependencies) {
        adapterState = manualDepsInit(instance);
        const stableConfig = {
          dependencies: (state: ExtractState<T>, bloc: InstanceState<T>) => {
            const deps = depsRef.current;
            return deps ? deps(state, bloc) : [];
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
    }, [BlocClass, instanceId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const externalDepsManager = useRef(new ExternalDepsManager());

  useEffect(() => {
    const manager = externalDepsManager.current;
    disableGetterTracking(adapterState, rawInstance);
    manager.updateSubscriptions(
      adapterState.getterState,
      rawInstance,
      forceUpdate,
    );
  }, [adapterState, rawInstance, forceUpdate]);

  useEffect(() => {
    const manager = externalDepsManager.current;

    // Register as consumer in devtools (if available)
    const devtools =
      typeof window !== 'undefined'
        ? (window as any).__BLAC_DEVTOOLS__
        : undefined;
    if (devtools?.registerConsumer && rawInstance) {
      devtools.registerConsumer(
        (rawInstance as any).instanceId,
        consumerIdRef.current,
        componentNameRef.current || 'Unknown',
      );
    }

    if (options?.onMount) {
      options.onMount(bloc as InstanceType<T>);
    }

    return () => {
      // Unregister consumer from devtools
      if (devtools?.unregisterConsumer && rawInstance) {
        devtools.unregisterConsumer(
          (rawInstance as any).instanceId,
          consumerIdRef.current,
        );
      }

      manager.cleanup();

      if (options?.onUnmount) {
        options.onUnmount(bloc as InstanceType<T>);
      }

      release(BlocClass, instanceKey);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<T, ExtractState<T>>;
}
