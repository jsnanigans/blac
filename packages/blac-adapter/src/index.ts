/**
 * @blac/adapter - Framework Adapter
 *
 * Reusable utilities for integrating BlaC with any reactive framework.
 * Provides subscription and snapshot functions for different tracking modes.
 *
 * This package provides the building blocks for React, Preact, Vue, and other
 * framework integrations.
 */
import type {
  ExtractState,
  InstanceReadonlyState,
  InstanceState,
  StateContainerConstructor,
  StateContainerInstance,
} from '@blac/core';

// Re-export types needed by framework integrations
export type {
  ExtractState,
  InstanceReadonlyState,
  InstanceState,
  StateContainerConstructor,
  StateContainerInstance,
} from '@blac/core';

// Re-export registry functions needed by hooks
export { acquire, release, isIsolatedClass, generateIsolatedKey } from '@blac/core';

// Import tracking types and functions from @blac/core/tracking subpath
import type {
  DependencyState,
  GetterState,
} from '@blac/core/tracking';

import {
  createDependencyState,
  startDependency,
  createDependencyProxy,
  capturePaths,
  hasDependencyChanges,
  hasTrackedData,
  shallowEqual,
  createGetterState,
  createBlocProxy,
  hasGetterChanges,
  setActiveTracker,
  clearActiveTracker,
  commitTrackedGetters,
  invalidateRenderCache,
  clearExternalDependencies,
  DependencyManager,
} from '@blac/core/tracking';

/**
 * Internal state for framework adapters, holding tracking and caching data.
 * @template TBloc - The state container type
 */
export interface AdapterState<TBloc extends StateContainerConstructor> {
  /** Dependency tracker for state property access tracking */
  dependencyState: DependencyState<ExtractState<TBloc>> | null;
  /** Cached manual dependencies for comparison */
  manualDepsCache: unknown[] | null;
  /** Getter state for computed property tracking */
  getterState: GetterState | null;
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
export class ExternalDepsManager {
  private manager = new DependencyManager();

  /**
   * Update subscriptions to external bloc dependencies.
   * Creates subscriptions to blocs accessed via getters.
   * @param getterState - The getter tracker state with external dependencies
   * @param rawInstance - The primary bloc instance (excluded from subscriptions)
   * @param onGetterChange - Callback to invoke when external dependency changes
   * @returns true if subscriptions were updated, false if unchanged
   */
  updateSubscriptions(
    getterState: GetterState | null,
    rawInstance: StateContainerInstance,
    onGetterChange: () => void,
  ): boolean {
    if (!getterState?.externalDependencies) {
      return false;
    }

    const currentDeps = getterState.externalDependencies;

    const onExternalChange = () => {
      invalidateRenderCache(getterState);

      if (hasGetterChanges(rawInstance, getterState)) {
        onGetterChange();
      }
    };

    const changed = this.manager.sync(
      currentDeps,
      onExternalChange,
      rawInstance,
    );

    clearExternalDependencies(getterState);

    return changed;
  }

  /**
   * Clean up all active subscriptions
   */
  cleanup(): void {
    this.manager.cleanup();
  }
}

export { DependencyManager };

/**
 * Create a subscribe function for auto-tracking mode.
 * Only triggers callback when tracked properties change.
 * @param instance - The state container instance
 * @param adapterState - The adapter state for tracking
 * @returns Subscribe function for use with useSyncExternalStore
 */
export function autoTrackSubscribe<TBloc extends StateContainerConstructor>(
  instance: InstanceReadonlyState<TBloc>,
  adapterState: AdapterState<TBloc>,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => {
    return instance.subscribe(() => {
      const depState =
        adapterState.dependencyState ||
        (adapterState.dependencyState = createDependencyState<any>());

      const hasStateDeps = depState.pathCache && depState.pathCache.size > 0;
      const hasGetterDeps =
        adapterState.getterState &&
        adapterState.getterState.trackedGetters.size > 0;

      const isPrimitiveState =
        instance.state !== null &&
        typeof instance.state !== 'object' &&
        typeof instance.state !== 'function';

      if (!hasStateDeps && !hasGetterDeps && !isPrimitiveState) {
        return;
      }

      let stateChanged = hasDependencyChanges(depState, instance.state);

      if (!hasStateDeps && hasGetterDeps) {
        stateChanged = false;
      }

      if (stateChanged) {
        callback();
        return;
      }

      const getterChanged = hasGetterChanges(
        instance,
        adapterState.getterState,
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
export function manualDepsSubscribe<TBloc extends StateContainerConstructor>(
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
export function noTrackSubscribe<TBloc extends StateContainerInstance>(
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
export function autoTrackSnapshot<TBloc extends StateContainerConstructor>(
  instance: InstanceReadonlyState<TBloc>,
  adapterState: AdapterState<TBloc>,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => {
    const depState =
      adapterState.dependencyState ||
      (adapterState.dependencyState = createDependencyState<any>());

    if (hasTrackedData(depState)) {
      capturePaths(depState, instance.state);
    }

    if (adapterState.getterState) {
      invalidateRenderCache(adapterState.getterState);

      commitTrackedGetters(adapterState.getterState);

      adapterState.getterState.isTracking = true;

      setActiveTracker(instance, adapterState.getterState);
    }

    startDependency(depState);
    return createDependencyProxy(depState, instance.state);
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
export function manualDepsSnapshot<TBloc extends StateContainerConstructor>(
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
export function noTrackSnapshot<TBloc extends StateContainerConstructor>(
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
export function autoTrackInit<TBloc extends StateContainerConstructor>(
  instance: InstanceState<TBloc>,
): AdapterState<TBloc> {
  return {
    dependencyState: null,
    manualDepsCache: null,
    getterState: createGetterState(),
    proxiedBloc: createBlocProxy(instance),
  };
}

/**
 * Initialize adapter state for manual dependency tracking mode.
 * No proxy is created; bloc is used directly.
 * @param instance - The state container instance
 * @returns Initialized adapter state
 */
export function manualDepsInit<TBloc extends StateContainerConstructor>(
  instance: InstanceState<TBloc>,
): AdapterState<TBloc> {
  return {
    dependencyState: null,
    manualDepsCache: null,
    getterState: null,
    proxiedBloc: instance,
  };
}

/**
 * Initialize adapter state for no-tracking mode.
 * No tracking or proxy is created.
 * @param instance - The state container instance
 * @returns Initialized adapter state
 */
export function noTrackInit<TBloc extends StateContainerConstructor>(
  instance: InstanceState<TBloc>,
): AdapterState<TBloc> {
  return {
    dependencyState: null,
    manualDepsCache: null,
    getterState: null,
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
  if (adapterState.getterState) {
    adapterState.getterState.isTracking = false;
    clearActiveTracker(rawInstance);
  }
}
