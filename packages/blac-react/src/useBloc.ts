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
} from '@blac/core';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';

type StateContainerConstructor<TBloc extends StateContainer<any>> =
  BlocConstructor<TBloc> & {
    resolve(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

function generateInstanceId(
  componentRef: ComponentRef,
  isIsolated: boolean,
  providedId?: string | number,
): string | undefined {
  if (providedId !== undefined) {
    // Convert number to string
    return typeof providedId === 'number' ? String(providedId) : providedId;
  }

  if (isIsolated) {
    if (!componentRef.__blocInstanceId) {
      componentRef.__blocInstanceId = `isolated-${Math.random().toString(36).slice(2, 11)}`;
    }
    return componentRef.__blocInstanceId;
  }

  return undefined;
}

interface TrackingMode {
  useManualDeps: boolean;
  autoTrackEnabled: boolean;
}

function determineTrackingMode<TBloc extends StateContainer<any>>(
  options?: UseBlocOptions<TBloc>,
): TrackingMode {
  return {
    useManualDeps: options?.dependencies !== undefined,
    autoTrackEnabled: options?.autoTrack !== false,
  };
}

/**
 * Lifecycle: INITIAL MOUNT
 * 1. useMemo runs once - creates bloc, subscribeFn, getSnapshotFn
 * 2. useSyncExternalStore calls getSnapshotFn (1st time) - lazy creates tracker, starts tracking, returns proxy
 * 3. Component renders - proxy tracks property accesses
 * 4. useSyncExternalStore calls getSnapshotFn (2nd time) - captures tracked paths, starts new tracking, returns proxy
 * 5. useSyncExternalStore calls subscribeFn - sets up state change listener
 *
 * Lifecycle: STATE CHANGE
 * 1. Bloc state changes
 * 2. subscribeFn callback checks hasChanges() - only re-renders if tracked paths changed
 * 3. If re-render: getSnapshotFn captures previous paths, starts tracking, returns proxy
 *
 * Lifecycle: RE-RENDER (parent re-render)
 * 1. useMemo returns cached values (same bloc, subscribeFn, getSnapshotFn)
 * 2. useSyncExternalStore calls getSnapshotFn - captures paths, starts tracking, returns proxy
 */
export function useBloc<T extends new (...args: any[]) => StateContainer<any>>(
  BlocClass: T & BlocConstructor<InstanceType<T>>,
  options?: UseBlocOptions<InstanceType<T>>,
): UseBlocReturn<InstanceType<T>> {
  // Component reference that persists across React Strict Mode remounts
  type TBloc = InstanceType<T>;
  const componentRef = useRef<ComponentRef>({});
  const Constructor = BlocClass as StateContainerConstructor<TBloc>;
  const isIsolated = Constructor.isolated === true;

  const [bloc, subscribe, getSnapshot, instanceKey, adapterState, rawInstance] =
    useMemo<
      readonly [
        TBloc,
        (callback: () => void) => () => void,
        () => ExtractState<TBloc>,
        string | undefined,
        AdapterState<ExtractState<TBloc>>,
        TBloc,
      ]
    >(() => {
      // Generate instance key
      const instanceId = generateInstanceId(
        componentRef.current,
        isIsolated,
        options?.instanceId,
      );

      // Get or create bloc instance with ownership (increments ref count)
      const instance = BlocClass.resolve(instanceId, options?.staticProps);

      // Determine tracking mode
      const { useManualDeps, autoTrackEnabled } =
        determineTrackingMode(options);

      // Create subscribe and getSnapshot functions based on tracking mode
      let subscribeFn: (callback: () => void) => () => void;
      let getSnapshotFn: () => ExtractState<TBloc>;
      let adapterState: AdapterState<ExtractState<TBloc>>;

      if (useManualDeps && options?.dependencies) {
        // Manual dependencies mode - no automatic tracking
        adapterState = initManualDepsState(instance);
        subscribeFn = createManualDepsSubscribe(instance, adapterState, {
          dependencies: options.dependencies,
        });
        getSnapshotFn = createManualDepsSnapshot(instance, adapterState, {
          dependencies: options.dependencies,
        });
      } else if (!autoTrackEnabled) {
        // No tracking mode
        adapterState = initNoTrackState(instance);
        subscribeFn = createNoTrackSubscribe(instance);
        getSnapshotFn = createNoTrackSnapshot(instance);
      } else {
        // Auto-tracking mode - enable both state and getter tracking
        adapterState = initAutoTrackState(instance);
        subscribeFn = createAutoTrackSubscribe(instance, adapterState);
        getSnapshotFn = createAutoTrackSnapshot(instance, adapterState);
      }

      return [
        adapterState.proxiedBloc!,
        subscribeFn,
        getSnapshotFn,
        instanceId,
        adapterState,
        instance,
      ];
    }, [BlocClass]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Force re-render mechanism for external bloc changes
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // External dependency manager (persists across renders)
  const externalDepsManager = useRef(new ExternalDependencyManager());

  // Disable getter tracking and manage external bloc subscriptions after each render
  useEffect(() => {
    disableGetterTracking(adapterState, rawInstance);
    externalDepsManager.current.updateSubscriptions(
      adapterState.getterTracker,
      rawInstance,
      forceUpdate,
    );
  }); // Run on every render to pick up new dependencies and disable tracking

  // Mount/unmount lifecycle
  useEffect(() => {
    // Call onMount callback if provided
    if (options?.onMount) {
      options.onMount(bloc);
    }

    return () => {
      // Cleanup in proper order: subscriptions -> callbacks -> disposal

      // 1. Clean up external subscriptions FIRST (before bloc is disposed)
      externalDepsManager.current.cleanup();

      // 2. Call onUnmount callback if provided
      if (options?.onUnmount) {
        options.onUnmount(bloc);
      }

      // 3. Release bloc reference
      Constructor.release(instanceKey);

      // 4. For isolated instances, dispose manually since registry doesn't track them
      if (isIsolated && !rawInstance.isDisposed) {
        rawInstance.dispose();
      }
    };
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>;
}
