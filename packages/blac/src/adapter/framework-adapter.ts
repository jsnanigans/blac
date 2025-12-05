/**
 * Framework Adapter
 *
 * Reusable utilities for integrating BlaC with any reactive framework.
 * Provides subscription and snapshot functions for different tracking modes.
 */
import type { TrackerState, GetterTrackerState } from '../tracking';
import type {
  ExtractState,
  InstanceReadonlyState,
  InstanceState,
  StateContainerConstructor,
  StateContainerInstance,
} from '../types/utilities';
import {
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
  hasTrackedData,
  shallowEqual,
  createGetterTracker,
  createBlocProxy,
  hasGetterChanges,
  setActiveTracker,
  clearActiveTracker,
  commitTrackedGetters,
  invalidateRenderCache,
  clearExternalDependencies,
} from '../tracking';

/**
 * Internal state for framework adapters, holding tracking and caching data.
 * @template TBloc - The state container type
 */
export interface AdapterState<TBloc extends StateContainerConstructor> {
  /** Proxy tracker for state property access tracking */
  tracker: TrackerState<ExtractState<TBloc>> | null;
  /** Cached manual dependencies for comparison */
  manualDepsCache: unknown[] | null;
  /** Getter tracker for computed property tracking */
  getterTracker: GetterTrackerState | null;
  /** Proxied bloc instance for auto-tracking */
  proxiedBloc: InstanceState<TBloc> | null;
}

/**
 * Configuration for manual dependency tracking mode
 * @template TBloc - The state container type
 */
export interface ManualDepsConfig<TBloc extends StateContainerConstructor> {
  /** Function that returns dependency array from state and bloc */
  dependencies: (
    state: ExtractState<TBloc>,
    bloc: InstanceState<TBloc>,
  ) => any[];
}

/**
 * Callback function invoked when subscribed state changes
 */
export type SubscriptionCallback = () => void;

/**
 * Function that subscribes to state changes and returns an unsubscribe function
 */
export type SubscribeFunction = (callback: SubscriptionCallback) => () => void;

/**
 * Function that returns a snapshot of the current state
 * @template TState - The state type
 */
export type SnapshotFunction<TState> = () => TState;

/**
 * Manages subscriptions to external bloc dependencies for getter tracking.
 * When a getter accesses another bloc's state, this manager ensures
 * re-renders occur when those external dependencies change.
 */
export class ExternalDependencyManager {
  private subscriptions: (() => void)[] = [];
  private previousDeps = new Set<StateContainerInstance>();

  private areDependenciesEqual(
    oldDeps: Set<StateContainerInstance>,
    newDeps: Set<StateContainerInstance>,
  ): boolean {
    if (oldDeps.size !== newDeps.size) return false;

    for (const dep of newDeps) {
      if (!oldDeps.has(dep)) return false;
    }

    return true;
  }

  /**
   * Update subscriptions to external bloc dependencies.
   * Creates subscriptions to blocs accessed via getters.
   * @param getterTracker - The getter tracker state with external dependencies
   * @param rawInstance - The primary bloc instance (excluded from subscriptions)
   * @param onGetterChange - Callback to invoke when external dependency changes
   * @returns true if subscriptions were updated, false if unchanged
   */
  updateSubscriptions(
    getterTracker: GetterTrackerState | null,
    rawInstance: StateContainerInstance,
    onGetterChange: () => void,
  ): boolean {
    if (!getterTracker?.externalDependencies) {
      return false;
    }

    const currentDeps = getterTracker.externalDependencies;

    if (this.areDependenciesEqual(this.previousDeps, currentDeps)) {
      clearExternalDependencies(getterTracker);
      return false;
    }

    this.cleanup();

    for (const externalBloc of currentDeps) {
      if (externalBloc === rawInstance) continue;

      const unsub = externalBloc.subscribe(() => {
        invalidateRenderCache(getterTracker);

        if (hasGetterChanges(rawInstance, getterTracker)) {
          onGetterChange();
        }
      });

      this.subscriptions.push(unsub);
    }

    this.previousDeps = new Set(currentDeps);

    clearExternalDependencies(getterTracker);

    return true;
  }

  /**
   * Clean up all active subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
  }
}

/**
 * Create a subscribe function for auto-tracking mode.
 * Only triggers callback when tracked properties change.
 * @param instance - The state container instance
 * @param adapterState - The adapter state for tracking
 * @returns Subscribe function for use with useSyncExternalStore
 */
export function createAutoTrackSubscribe<
  TBloc extends StateContainerConstructor,
>(
  instance: InstanceReadonlyState<TBloc>,
  adapterState: AdapterState<TBloc>,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => {
    return instance.subscribe(() => {
      const tracker =
        adapterState.tracker ||
        (adapterState.tracker = createTrackerState<any>());

      const hasStateDeps = tracker.pathCache && tracker.pathCache.size > 0;
      const hasGetterDeps =
        adapterState.getterTracker &&
        adapterState.getterTracker.trackedGetters.size > 0;

      const isPrimitiveState =
        instance.state !== null &&
        typeof instance.state !== 'object' &&
        typeof instance.state !== 'function';

      if (!hasStateDeps && !hasGetterDeps && !isPrimitiveState) {
        return;
      }

      let stateChanged = hasChanges(tracker, instance.state);

      if (!hasStateDeps && hasGetterDeps) {
        stateChanged = false;
      }

      if (stateChanged) {
        callback();
        return;
      }

      const getterChanged = hasGetterChanges(
        instance,
        adapterState.getterTracker,
      );

      if (getterChanged) {
        callback();
      }
    });
  };
}

/**
 * Create a subscribe function for manual dependency tracking mode.
 * Only triggers callback when dependencies array changes.
 * @param instance - The state container instance
 * @param adapterState - The adapter state for caching
 * @param config - Configuration with dependencies function
 * @returns Subscribe function for use with useSyncExternalStore
 */
export function createManualDepsSubscribe<
  TBloc extends StateContainerConstructor,
>(
  instance: InstanceState<TBloc>,
  adapterState: AdapterState<TBloc>,
  config: ManualDepsConfig<TBloc>,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => {
    return instance.subscribe(() => {
      const newDeps = config.dependencies(instance.state, instance);
      if (
        !adapterState.manualDepsCache ||
        !shallowEqual(adapterState.manualDepsCache, newDeps)
      ) {
        adapterState.manualDepsCache = newDeps;
        callback();
      }
    });
  };
}

/**
 * Create a subscribe function for no-tracking mode.
 * Triggers callback on every state change.
 * @param instance - The state container instance
 * @returns Subscribe function for use with useSyncExternalStore
 */
export function createNoTrackSubscribe<TBloc extends StateContainerInstance>(
  instance: TBloc,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => instance.subscribe(callback);
}

/**
 * Create a snapshot function for auto-tracking mode.
 * Returns a proxied state that tracks property access.
 * @param instance - The state container instance
 * @param adapterState - The adapter state for tracking
 * @returns Snapshot function for use with useSyncExternalStore
 */
export function createAutoTrackSnapshot<
  TBloc extends StateContainerConstructor,
>(
  instance: InstanceReadonlyState<TBloc>,
  adapterState: AdapterState<TBloc>,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => {
    const tracker =
      adapterState.tracker ||
      (adapterState.tracker = createTrackerState<any>());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);
    }

    if (adapterState.getterTracker) {
      invalidateRenderCache(adapterState.getterTracker);

      commitTrackedGetters(adapterState.getterTracker);

      adapterState.getterTracker.isTracking = true;

      setActiveTracker(instance, adapterState.getterTracker);
    }

    startTracking(tracker);
    return createProxy(tracker, instance.state);
  };
}

/**
 * Create a snapshot function for manual dependency tracking mode.
 * Caches dependencies for comparison on next render.
 * @param instance - The state container instance
 * @param adapterState - The adapter state for caching
 * @param config - Configuration with dependencies function
 * @returns Snapshot function for use with useSyncExternalStore
 */
export function createManualDepsSnapshot<
  TBloc extends StateContainerConstructor,
>(
  instance: InstanceState<TBloc>,
  adapterState: AdapterState<TBloc>,
  config: ManualDepsConfig<TBloc>,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => {
    adapterState.manualDepsCache = config.dependencies(
      instance.state,
      instance,
    );
    return instance.state;
  };
}

/**
 * Create a snapshot function for no-tracking mode.
 * Returns the raw state directly.
 * @param instance - The state container instance
 * @returns Snapshot function for use with useSyncExternalStore
 */
export function createNoTrackSnapshot<TBloc extends StateContainerConstructor>(
  instance: InstanceReadonlyState<TBloc>,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => instance.state;
}

/**
 * Initialize adapter state for auto-tracking mode.
 * Creates getter tracker and proxied bloc instance.
 * @param instance - The state container instance
 * @returns Initialized adapter state
 */
export function initAutoTrackState<TBloc extends StateContainerConstructor>(
  instance: InstanceState<TBloc>,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: createGetterTracker(),
    proxiedBloc: createBlocProxy(instance),
  };
}

/**
 * Initialize adapter state for manual dependency tracking mode.
 * No proxy is created; bloc is used directly.
 * @param instance - The state container instance
 * @returns Initialized adapter state
 */
export function initManualDepsState<TBloc extends StateContainerConstructor>(
  instance: InstanceState<TBloc>,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: null,
    proxiedBloc: instance,
  };
}

/**
 * Initialize adapter state for no-tracking mode.
 * No tracking or proxy is created.
 * @param instance - The state container instance
 * @returns Initialized adapter state
 */
export function initNoTrackState<TBloc extends StateContainerConstructor>(
  instance: InstanceState<TBloc>,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: null,
    proxiedBloc: instance,
  };
}

/**
 * Disable getter tracking after render phase completes.
 * Clears the active tracker to prevent tracking outside of render.
 * @param adapterState - The adapter state
 * @param rawInstance - The raw bloc instance
 */
export function disableGetterTracking<TBloc extends StateContainerConstructor>(
  adapterState: AdapterState<TBloc>,
  rawInstance: InstanceState<TBloc>,
): void {
  if (adapterState.getterTracker) {
    adapterState.getterTracker.isTracking = false;
    clearActiveTracker(rawInstance);
  }
}
