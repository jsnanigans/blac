import {
  useMemo,
  useSyncExternalStore,
  useEffect,
  useRef,
  useReducer,
} from 'react';
import {
  type BlocConstructor,
  StateContainer,
  type ExtractState,
  type AdapterState,
  ExternalDependencyManager,
  createAutoTrackSubscribe,
  createManualDepsSubscribe,
  createNoTrackSubscribe,
  createAutoTrackSnapshot,
  createManualDepsSnapshot,
  createNoTrackSnapshot,
  initAutoTrackState,
  initManualDepsState,
  initNoTrackState,
  disableGetterTracking,
  isIsolatedClass,
} from '@blac/core';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';
import { generateInstanceKey } from './utils/instance-keys';

type StateContainerConstructor<TBloc extends StateContainer<any, any>> =
  BlocConstructor<TBloc> & {
    resolve(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

interface TrackingMode {
  useManualDeps: boolean;
  autoTrackEnabled: boolean;
}

function determineTrackingMode<TBloc extends StateContainer<any, any>>(
  options?: UseBlocOptions<TBloc>,
): TrackingMode {
  return {
    useManualDeps: options?.dependencies !== undefined,
    autoTrackEnabled: options?.autoTrack !== false,
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
 * @template T - The state container constructor type
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
  T extends new (...args: any[]) => StateContainer<any, any>,
>(
  BlocClass: T & BlocConstructor<InstanceType<T>>,
  options?: UseBlocOptions<InstanceType<T>>,
): UseBlocReturn<InstanceType<T>> {
  type TBloc = InstanceType<T>;
  const componentRef = useRef<ComponentRef>({});
  const Constructor = BlocClass as StateContainerConstructor<TBloc>;
  const isIsolated = isIsolatedClass(BlocClass);

  const initialPropsRef = useRef(options?.props);

  const [bloc, subscribe, getSnapshot, instanceKey, adapterState, rawInstance] =
    useMemo<
      readonly [
        TBloc,
        (callback: () => void) => () => void,
        () => ExtractState<TBloc>,
        string | undefined,
        AdapterState<TBloc>,
        TBloc,
      ]
    >(() => {
      const instanceKey = generateInstanceKey(
        componentRef.current,
        isIsolated,
        options?.instanceId,
      );

      const instance = BlocClass.resolve(instanceKey, initialPropsRef.current);

      if (initialPropsRef.current !== undefined) {
        instance.updateProps(initialPropsRef.current);
      }

      const { useManualDeps, autoTrackEnabled } =
        determineTrackingMode(options);

      let subscribeFn: (callback: () => void) => () => void;
      let getSnapshotFn: () => ExtractState<TBloc>;
      let adapterState: AdapterState<TBloc>;

      if (useManualDeps && options?.dependencies) {
        adapterState = initManualDepsState(instance);
        subscribeFn = createManualDepsSubscribe(instance, adapterState, {
          dependencies: options.dependencies,
        });
        getSnapshotFn = createManualDepsSnapshot(instance, adapterState, {
          dependencies: options.dependencies,
        });
      } else if (!autoTrackEnabled) {
        adapterState = initNoTrackState(instance);
        subscribeFn = createNoTrackSubscribe(instance);
        getSnapshotFn = createNoTrackSnapshot(instance);
      } else {
        adapterState = initAutoTrackState(instance);
        subscribeFn = createAutoTrackSubscribe(instance, adapterState);
        getSnapshotFn = createAutoTrackSnapshot(instance, adapterState);
      }

      return [
        adapterState.proxiedBloc!,
        subscribeFn,
        getSnapshotFn,
        instanceKey,
        adapterState,
        instance,
      ];
    }, [BlocClass, options?.instanceId]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const externalDepsManager = useRef(new ExternalDependencyManager());

  useEffect(() => {
    if (options?.props !== initialPropsRef.current) {
      rawInstance.updateProps(options?.props);
    }
  }, [options?.props, rawInstance]);

  useEffect(() => {
    disableGetterTracking(adapterState, rawInstance);
    externalDepsManager.current.updateSubscriptions(
      adapterState.getterTracker,
      rawInstance,
      forceUpdate,
    );
  });

  useEffect(() => {
    if (options?.onMount) {
      options.onMount(bloc);
    }

    return () => {
      externalDepsManager.current.cleanup();

      if (options?.onUnmount) {
        options.onUnmount(bloc);
      }

      Constructor.release(instanceKey);

      if (isIsolated && !rawInstance.isDisposed) {
        rawInstance.dispose();
      }
    };
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>;
}
