/**
 * Framework Adapter - Reusable logic for integrating BlaC with any reactive framework
 *
 * This module provides framework-agnostic utilities for:
 * - Subscription management (auto-tracking, manual deps, no-tracking modes)
 * - Snapshot generation (state proxies with tracking)
 * - External dependency management (cross-bloc subscriptions)
 * - Change detection (state and getter tracking)
 *
 * Can be used to integrate BlaC with React, Vue, Solid, Svelte, Angular, etc.
 */

import type { StateContainer } from '../core/StateContainer';
import type { TrackerState, GetterTrackerState } from '../tracking';
import type { ExtractState } from '../types/utilities';
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
 * Framework-agnostic adapter state
 * Frameworks should store this in their component state mechanism
 */
export interface AdapterState<TBloc extends StateContainer<any>> {
  /** State property tracker */
  tracker: TrackerState<ExtractState<TBloc>> | null;
  /** Manual dependencies cache */
  manualDepsCache: unknown[] | null;
  /** Getter tracking state */
  getterTracker: GetterTrackerState | null;
  /** Cached proxied bloc instance */
  proxiedBloc: TBloc | null;
}

/**
 * Configuration for manual dependencies mode
 */
export interface ManualDepsConfig<TBloc extends StateContainer<any>> {
  dependencies: (state: any, bloc: TBloc) => unknown[];
}

/**
 * Subscription callback type
 * Called when the framework should re-render
 */
export type SubscriptionCallback = () => void;

/**
 * Subscription function type
 * Returns an unsubscribe function
 */
export type SubscribeFunction = (callback: SubscriptionCallback) => () => void;

/**
 * Snapshot function type
 * Returns the current state (possibly proxied)
 */
export type SnapshotFunction<TState> = () => TState;

/**
 * External dependency manager
 * Handles subscriptions to external blocs accessed in getters
 */
export class ExternalDependencyManager {
  private subscriptions: (() => void)[] = [];
  private previousDeps = new Set<StateContainer<any>>();

  /**
   * Check if dependencies have changed
   */
  private areDependenciesEqual(
    oldDeps: Set<StateContainer<any>>,
    newDeps: Set<StateContainer<any>>,
  ): boolean {
    if (oldDeps.size !== newDeps.size) return false;

    for (const dep of newDeps) {
      if (!oldDeps.has(dep)) return false;
    }

    return true;
  }

  /**
   * Update external subscriptions
   * @param getterTracker - The getter tracker state
   * @param rawInstance - The raw bloc instance (exclude from subscriptions)
   * @param onGetterChange - Callback when external getter changes
   * @returns Whether subscriptions were updated
   */
  updateSubscriptions(
    getterTracker: GetterTrackerState | null,
    rawInstance: StateContainer<any>,
    onGetterChange: () => void,
  ): boolean {
    if (!getterTracker?.externalDependencies) {
      return false;
    }

    const currentDeps = getterTracker.externalDependencies;

    // Optimization: Skip if dependencies haven't changed
    if (this.areDependenciesEqual(this.previousDeps, currentDeps)) {
      clearExternalDependencies(getterTracker);
      return false;
    }

    // Clean up old subscriptions
    this.cleanup();

    // Subscribe to each external dependency
    for (const externalBloc of currentDeps) {
      if (externalBloc === rawInstance) continue;

      const unsub = externalBloc.subscribe(() => {
        // Invalidate the render cache so getters are recomputed with fresh values
        invalidateRenderCache(getterTracker);

        // When external bloc changes, check if our getters changed
        if (hasGetterChanges(rawInstance, getterTracker)) {
          onGetterChange();
        }
      });

      this.subscriptions.push(unsub);
    }

    // Store current dependencies for next comparison
    this.previousDeps = new Set(currentDeps);

    // Clear external dependencies AFTER setting up subscriptions
    clearExternalDependencies(getterTracker);

    return true;
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
  }
}

/**
 * Create a subscription function for auto-tracking mode
 */
export function createAutoTrackSubscribe<TBloc extends StateContainer<any>>(
  instance: TBloc,
  adapterState: AdapterState<TBloc>,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => {
    return instance.subscribe(() => {
      const tracker =
        adapterState.tracker ||
        (adapterState.tracker = createTrackerState<any>());

      // Check if we have tracked dependencies
      const hasStateDeps = tracker.pathCache && tracker.pathCache.size > 0;
      const hasGetterDeps =
        adapterState.getterTracker &&
        adapterState.getterTracker.trackedGetters.size > 0;

      // Special case: Primitive state can't be proxied
      const isPrimitiveState =
        instance.state !== null &&
        typeof instance.state !== 'object' &&
        typeof instance.state !== 'function';

      // EARLY EXIT: If nothing tracked at all after first render, no re-render needed
      if (!hasStateDeps && !hasGetterDeps && !isPrimitiveState) {
        return;
      }

      // At this point we know something was tracked, check for changes
      let stateChanged = hasChanges(tracker, instance.state);

      // Special case: if NO state properties were tracked but getters WERE tracked,
      // don't treat "no state tracking" as "track everything"
      if (!hasStateDeps && hasGetterDeps) {
        stateChanged = false; // Override - only getters are relevant
      }

      // EARLY EXIT: If state already changed, skip getter checks
      if (stateChanged) {
        callback();
        return;
      }

      // Only check getters if state didn't change
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
 * Create a subscription function for manual dependencies mode
 */
export function createManualDepsSubscribe<TBloc extends StateContainer<any>>(
  instance: TBloc,
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
 * Create a subscription function for no-tracking mode
 */
export function createNoTrackSubscribe<TBloc extends StateContainer<any>>(
  instance: TBloc,
): SubscribeFunction {
  return (callback: SubscriptionCallback) => instance.subscribe(callback);
}

/**
 * Create a snapshot function for auto-tracking mode
 */
export function createAutoTrackSnapshot<TBloc extends StateContainer<any>>(
  instance: TBloc,
  adapterState: AdapterState<TBloc>,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => {
    const tracker =
      adapterState.tracker ||
      (adapterState.tracker = createTrackerState<any>());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);
    }

    // Enable getter tracking during render and set as active tracker
    if (adapterState.getterTracker) {
      // Invalidate render cache at the START of each render
      invalidateRenderCache(adapterState.getterTracker);

      // Capture getters from previous render
      commitTrackedGetters(adapterState.getterTracker);

      // Enable tracking for this render
      adapterState.getterTracker.isTracking = true;

      // Set this component's tracker as the active one for this bloc
      setActiveTracker(instance, adapterState.getterTracker);
    }

    startTracking(tracker);
    return createProxy(tracker, instance.state);
  };
}

/**
 * Create a snapshot function for manual dependencies mode
 */
export function createManualDepsSnapshot<TBloc extends StateContainer<any>>(
  instance: TBloc,
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
 * Create a snapshot function for no-tracking mode
 */
export function createNoTrackSnapshot<TBloc extends StateContainer<any>>(
  instance: TBloc,
): SnapshotFunction<ExtractState<TBloc>> {
  return () => instance.state;
}

/**
 * Initialize adapter state for auto-tracking mode
 */
export function initAutoTrackState<TBloc extends StateContainer<any>>(
  instance: TBloc,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: createGetterTracker(),
    proxiedBloc: createBlocProxy(instance) as TBloc,
  };
}

/**
 * Initialize adapter state for manual dependencies mode
 */
export function initManualDepsState<TBloc extends StateContainer<any>>(
  instance: TBloc,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: null,
    proxiedBloc: instance, // Use raw instance
  };
}

/**
 * Initialize adapter state for no-tracking mode
 */
export function initNoTrackState<TBloc extends StateContainer<any>>(
  instance: TBloc,
): AdapterState<TBloc> {
  return {
    tracker: null,
    manualDepsCache: null,
    getterTracker: null,
    proxiedBloc: instance, // Use raw instance
  };
}

/**
 * Disable getter tracking (call after render completes)
 */
export function disableGetterTracking<TBloc extends StateContainer<any>>(
  adapterState: AdapterState<TBloc>,
  rawInstance: TBloc,
): void {
  if (adapterState.getterTracker) {
    adapterState.getterTracker.isTracking = false;
    clearActiveTracker(rawInstance);
  }
}
