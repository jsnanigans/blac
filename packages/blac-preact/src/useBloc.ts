import { useMemo, useEffect, useRef, useReducer } from 'preact/hooks';
import { useSyncExternalStore } from 'preact/compat';
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
  isIsolatedClass,
  type StateContainerConstructor,
  type InstanceState,
  acquire,
  release,
} from '@blac/adapter';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';
import { generateInstanceKey } from './utils/instance-keys';
import { getBlacPreactConfig } from './config';

interface TrackingMode {
  useManualDeps: boolean;
  autoTrackEnabled: boolean;
}

function determineTrackingMode<TBloc extends StateContainerConstructor>(
  options?: Pick<UseBlocOptions<TBloc>, 'autoTrack' | 'dependencies'>,
): TrackingMode {
  const globalConfig = getBlacPreactConfig();
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
 * @example With manual dependencies
 * ```ts
 * const [state, myBloc] = useBloc(MyBloc, {
 *   dependencies: (state) => [state.count]
 * });
 * ```
 *
 * @example With isolated instance
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
  const isIsolated = isIsolatedClass(BlocClass);
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
      const instanceKey = generateInstanceKey(
        componentRef.current,
        isIsolated,
        instanceId,
      );

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

      return [
        adapterState.proxiedBloc as TBloc,
        subscribeFn,
        getSnapshotFn,
        instanceKey,
        adapterState,
        instance,
      ];
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [BlocClass, isIsolated, instanceId]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const externalDepsManager = useRef(new ExternalDepsManager());

  useEffect(() => {
    const manager = externalDepsManager.current;
    disableGetterTracking(adapterState, rawInstance);
    manager.updateSubscriptions(adapterState.getterState, rawInstance, () =>
      forceUpdate(0),
    );
  });

  useEffect(() => {
    const manager = externalDepsManager.current;
    if (options?.onMount) {
      options.onMount(bloc as InstanceType<T>);
    }

    return () => {
      manager.cleanup();

      if (options?.onUnmount) {
        options.onUnmount(bloc as InstanceType<T>);
      }

      release(BlocClass, instanceKey);

      if (isIsolated && !rawInstance.isDisposed) {
        rawInstance.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<T, ExtractState<T>>;
}
