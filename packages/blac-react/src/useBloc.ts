import {
  useMemo,
  useSyncExternalStore,
  useEffect,
  useRef,
  useReducer,
} from 'react';
import {
  type ExtractState,
  type AdapterState,
  type IsStatelessContainer,
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
  isStatelessClass,
  StateContainerConstructor,
  InstanceState,
} from '@blac/core';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';
import { generateInstanceKey } from './utils/instance-keys';
import { getBlacReactConfig } from './config';

interface TrackingMode {
  useManualDeps: boolean;
  autoTrackEnabled: boolean;
}

function determineTrackingMode<TBloc extends StateContainerConstructor>(
  options?: UseBlocOptions<TBloc>,
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
 * Type that produces a TypeScript error when a stateless container is used.
 * Evaluates to `never` for stateless containers, causing a type mismatch.
 */
type StatefulContainer<T extends StateContainerConstructor> =
  IsStatelessContainer<T> extends true ? never : T;

/**
 * React hook that connects a component to a state container with automatic re-render on state changes.
 *
 * Supports three tracking modes:
 * - **Auto-tracking** (default): Automatically detects accessed state properties via Proxy
 * - **Manual dependencies**: Explicit dependency array like useEffect
 * - **No tracking**: Returns full state without optimization
 *
 * **Note:** This hook does NOT support stateless containers (StatelessCubit, StatelessVertex).
 * Use `useBlocActions()` instead for stateless containers.
 *
 * @template T - The state container constructor type (inferred from BlocClass)
 * @param BlocClass - The state container class to connect to (must not be stateless)
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
  BlocClass: StatefulContainer<T>,
  options?: UseBlocOptions<T>,
): UseBlocReturn<T, ExtractState<T>> {
  const componentRef = useRef<ComponentRef>({});

  // Runtime check for stateless containers - log error but don't crash
  if (isStatelessClass(BlocClass)) {
    console.error(
      `[BlaC] useBloc() does not support stateless containers. ` +
        `"${BlocClass.name}" is a StatelessCubit or StatelessVertex. ` +
        `Use useBlocActions() instead for stateless containers.`,
    );
    // Return a minimal working result to avoid crashing the app
    const instance = (BlocClass as any).resolve('default', {}) as InstanceType<T>;
    return [
      {} as ExtractState<T>,
      instance as any,
      componentRef,
    ] as UseBlocReturn<T, ExtractState<T>>;
  }

  type TBloc = InstanceState<T>;
  const isIsolated = isIsolatedClass(BlocClass);

  const initialPropsRef = useRef(options?.props);

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
        options?.instanceId,
      );

      const instance = (BlocClass as any).resolve(instanceKey, {
        props: initialPropsRef.current,
      }) as TBloc;

      if (initialPropsRef.current !== undefined) {
        instance.updateProps(initialPropsRef.current);
      }

      const { useManualDeps, autoTrackEnabled } =
        determineTrackingMode(options);

      let subscribeFn: (callback: () => void) => () => void;
      let getSnapshotFn: () => ExtractState<T>;
      let adapterState: AdapterState<T>;

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
      options.onMount(bloc as InstanceType<T>);
    }

    return () => {
      externalDepsManager.current.cleanup();

      if (options?.onUnmount) {
        options.onUnmount(bloc as InstanceType<T>);
      }

      (BlocClass as any).release(instanceKey);

      if (isIsolated && !rawInstance.isDisposed) {
        rawInstance.dispose();
      }
    };
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<T, ExtractState<T>>;
}
