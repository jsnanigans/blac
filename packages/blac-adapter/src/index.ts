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

import type { DependencyState, GetterState } from '@blac/core/tracking';

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
  commitTrackedGetters,
  invalidateRenderCache,
  resolveDependencies,
  DependencyManager,
} from '@blac/core/tracking';

export type {
  ExtractArgs,
  ExtractDeps,
  ExtractState,
  InstanceReadonlyState,
  InstanceState,
  StateContainerConstructor,
  StateContainerInstance,
} from '@blac/core';

export { acquire, release, APPLY_DEPS, REMOVE_DEPS_OWNER } from '@blac/core';

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
  proxiedBloc: InstanceState<TBloc>;
  /**
   * The last state value returned by the snapshot function. Used to detect
   * transitions between trackable (object/function) and untrackable
   * (null/undefined/primitive) shapes so that null↔object transitions always
   * trigger a re-render even when pathCache is empty.
   */
  lastSnapshotState: ExtractState<TBloc> | undefined;
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
  ) => unknown[];
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
  private cachedDeps: Set<StateContainerInstance> | null = null;

  private resolveCached(
    rawInstance: StateContainerInstance,
  ): Set<StateContainerInstance> {
    if (this.cachedDeps) {
      let allValid = true;
      for (const dep of this.cachedDeps) {
        if (dep.isDisposed) {
          allValid = false;
          break;
        }
      }
      if (allValid) return this.cachedDeps;
    }
    const deps = resolveDependencies(rawInstance);
    this.cachedDeps = deps;
    return deps;
  }

  /**
   * Update subscriptions to external bloc dependencies.
   * Resolves transitive dependencies via depend() declarations.
   * @param getterState - The getter tracker state (needed for change detection)
   * @param rawInstance - The primary bloc instance (excluded from subscriptions)
   * @param onGetterChange - Callback to invoke when external dependency changes
   * @returns true if subscriptions were updated, false if unchanged
   */
  updateSubscriptions(
    getterState: GetterState | null,
    rawInstance: StateContainerInstance,
    onGetterChange: () => void,
  ): boolean {
    if (!getterState || rawInstance.dependencies.size === 0) {
      return false;
    }

    const currentDeps = this.resolveCached(rawInstance);

    const onExternalChange = () => {
      invalidateRenderCache(getterState);

      if (hasGetterChanges(rawInstance, getterState)) {
        onGetterChange();
      }
    };

    return this.manager.sync(currentDeps, onExternalChange, rawInstance);
  }

  /**
   * Clean up all active subscriptions
   */
  cleanup(): void {
    this.manager.cleanup();
    this.cachedDeps = null;
  }
}

export { DependencyManager };

function isSsrEnvironment(): boolean {
  return typeof window === 'undefined' || typeof document === 'undefined';
}

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
  if (isSsrEnvironment()) {
    return noTrackSubscribe(instance);
  }

  return (callback: SubscriptionCallback) => {
    if (instance.isDisposed) return () => {};
    return instance.subscribe(() => {
      const depState =
        adapterState.dependencyState ||
        (adapterState.dependencyState =
          createDependencyState<ExtractState<TBloc>>());

      const hasStateDeps = depState.pathCache && depState.pathCache.size > 0;
      const hasGetterDeps =
        adapterState.getterState &&
        adapterState.getterState.trackedGetters.size > 0;

      const wasTrackable =
        adapterState.lastSnapshotState !== null &&
        adapterState.lastSnapshotState !== undefined &&
        (typeof adapterState.lastSnapshotState === 'object' ||
          typeof adapterState.lastSnapshotState === 'function');
      const isTrackable =
        instance.state !== null &&
        instance.state !== undefined &&
        (typeof instance.state === 'object' ||
          typeof instance.state === 'function');

      if (wasTrackable !== isTrackable) {
        callback();
        return;
      }

      if (!isTrackable) {
        callback(); // primitive / null / undefined — no tracking possible
        return;
      }

      if (!hasStateDeps && !hasGetterDeps) {
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
    if (instance.isDisposed) return () => {};
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
  return (callback: SubscriptionCallback) => {
    if (instance.isDisposed) return () => {};
    return instance.subscribe(callback);
  };
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
  if (isSsrEnvironment()) {
    return noTrackSnapshot(instance);
  }

  return () => {
    const depState =
      adapterState.dependencyState ||
      (adapterState.dependencyState =
        createDependencyState<ExtractState<TBloc>>());

    if (hasTrackedData(depState)) {
      capturePaths(depState, instance.state);
    }

    if (adapterState.getterState) {
      // Enable per-consumer getter tracking for the upcoming render. Only
      // clear `currentlyAccessing` on the false→true transition (the first
      // snapshot call after a post-render commit) — `useSyncExternalStore`
      // can invoke `getSnapshot` multiple times per render attempt, and
      // clearing on every call would wipe accesses already recorded during
      // the same render. Across React StrictMode double-invocation no
      // commit runs between the two render passes, so accesses are
      // idempotently re-added and the post-effect commit captures them once.
      invalidateRenderCache(adapterState.getterState);
      if (!adapterState.getterState.isTracking) {
        adapterState.getterState.currentlyAccessing.clear();
        adapterState.getterState.isTracking = true;
      }
    }

    startDependency(depState);
    adapterState.lastSnapshotState = instance.state;
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
    adapterState.lastSnapshotState = instance.state;
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
  if (isSsrEnvironment()) {
    return noTrackInit(instance);
  }

  const getterState = createGetterState();
  return {
    dependencyState: null,
    manualDepsCache: null,
    getterState,
    proxiedBloc: createBlocProxy(instance, getterState),
    lastSnapshotState: undefined,
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
    lastSnapshotState: undefined,
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
    lastSnapshotState: undefined,
  };
}

/**
 * Disable getter tracking after render phase completes.
 * Flips the per-consumer tracker off so post-commit getter access is not
 * recorded into this render's tracked set.
 * @param adapterState - The adapter state
 */
export function disableGetterTracking<TBloc extends StateContainerConstructor>(
  adapterState: AdapterState<TBloc>,
): void {
  const gs = adapterState.getterState;
  if (!gs) return;
  // Only act if a render phase actually ran since the last commit. The
  // useEffect that calls us has no dep array (runs on every commit) and React
  // StrictMode double-invocation can fire it twice for one logical render.
  // `isTracking` doubles as the dirty flag: snapshot flips it to true at the
  // start of a render phase, and we flip it back to false here. A subsequent
  // call with `isTracking` already false is a no-op so the committed
  // `trackedGetters` from the prior commit is preserved.
  //
  // `commitTrackedGetters` itself also guards against empty `currentlyAccessing`
  // (see its docstring) so the two checks are mutually reinforcing.
  if (!gs.isTracking) return;
  gs.isTracking = false;
  commitTrackedGetters(gs);
}
