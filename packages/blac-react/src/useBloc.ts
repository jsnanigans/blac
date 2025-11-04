/**
 * useBloc - hook for BlaC state management in React with automatic proxy tracking
 *
 * @example
 * ```tsx
 * // Basic usage - automatic tracking of accessed properties
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>  // Only re-renders when count changes
 *       <button onClick={bloc.increment}>+</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useMemo, useSyncExternalStore, useEffect, useRef } from 'react';
import {
  type AnyObject,
  type BlocConstructor,
  StateContainer,
  type ExtractState,
  // Import tracking utilities from core
  type TrackerState,
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
  hasTrackedData,
  shallowEqual,
  // Import getter tracking utilities from core
  type GetterTrackerState,
  createGetterTracker,
  createBlocProxy,
  hasGetterChanges,
  setActiveTracker,
  clearActiveTracker,
  commitTrackedGetters,
  invalidateRenderCache,
} from '@blac/core';
import type {
  UseBlocOptions,
  UseBlocReturn,
  ComponentRef,
  UseBlocOptionsWithDependencies,
} from './types';

/**
 * StateContainer constructor with required static methods
 */
type StateContainerConstructor<TBloc extends StateContainer<any>> =
  BlocConstructor<TBloc> & {
    resolve(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

/**
 * Generates instance ID for isolated blocs
 */
function generateInstanceId(
  componentRef: ComponentRef,
  isIsolated: boolean,
  providedId?: string,
): string | undefined {
  if (providedId) return providedId;

  if (isIsolated) {
    if (!componentRef.__blocInstanceId) {
      componentRef.__blocInstanceId = `isolated-${Math.random().toString(36).slice(2, 11)}`;
    }
    return componentRef.__blocInstanceId;
  }

  return undefined;
}

/**
 * Determines tracking mode from options
 */
interface TrackingMode {
  useManualDeps: boolean;
  autoTrackEnabled: boolean;
}

function determineTrackingMode<TBloc extends StateContainer<AnyObject>>(
  options?: UseBlocOptions<TBloc>,
): TrackingMode {
  return {
    useManualDeps: options?.dependencies !== undefined,
    autoTrackEnabled: options?.autoTrack !== false,
  };
}

/**
 * Internal state for subscription and snapshot functions
 */
interface HookState<TBloc extends StateContainer<AnyObject>> {
  /** State property tracker (existing) */
  tracker: TrackerState<ExtractState<TBloc>> | null;
  /** Manual dependencies cache (existing) */
  manualDepsCache: unknown[] | null;
  /** Getter tracking state (new) */
  getterTracker: GetterTrackerState | null;
  /** Cached proxied bloc instance (new) */
  proxiedBloc: TBloc | null;
}

/**
 * Factory: Creates subscribe function for automatic proxy tracking mode
 */
function createAutoTrackSubscribe<TBloc extends StateContainer<AnyObject>>(
  instance: TBloc,
  hookState: HookState<TBloc>,
): (callback: () => void) => () => void {
  return (callback: () => void) => {
    return instance.subscribe(() => {
      const tracker =
        hookState.tracker ||
        (hookState.tracker = createTrackerState<ExtractState<TBloc>>());

      // Check if we have tracked state properties
      // Note: pathCache contains committed tracked paths after first render completes
      const hasStateDeps = tracker.pathCache && tracker.pathCache.size > 0;
      const hasGetterDeps =
        hookState.getterTracker &&
        hookState.getterTracker.trackedGetters.size > 0;

      // Special case: Primitive state (number, string, boolean) can't be proxied
      // so nothing gets tracked. Use conservative behavior for primitive state.
      const isPrimitiveState =
        instance.state !== null &&
        typeof instance.state !== 'object' &&
        typeof instance.state !== 'function';

      // EARLY EXIT: If nothing tracked at all after first render, no re-render needed
      // This handles the case where state is destructured but never accessed.
      // Exception: For primitive state, always re-render (can't track primitives)
      if (!hasStateDeps && !hasGetterDeps && !isPrimitiveState) {
        return;
      }

      // At this point we know something was tracked, check for changes
      let stateChanged = hasChanges(tracker, instance.state);

      // Special case: if NO state properties were tracked (pathCache.size === 0)
      // but getters WERE tracked, then don't treat "no state tracking" as "track everything".
      // Only rely on getter changes in this case.
      if (!hasStateDeps && hasGetterDeps) {
        stateChanged = false; // Override - only getters are relevant
      }

      // EARLY EXIT: If state already changed, skip getter checks entirely
      if (stateChanged) {
        callback();
        return;
      }

      // Only check getters if state didn't change
      const getterChanged = hasGetterChanges(instance, hookState.getterTracker);

      if (getterChanged) {
        callback();
      }
    });
  };
}

/**
 * Factory: Creates subscribe function for manual dependencies mode
 */
function createManualDepsSubscribe<TBloc extends StateContainer<AnyObject>>(
  instance: TBloc,
  hookState: HookState<TBloc>,
  options: UseBlocOptionsWithDependencies<TBloc>,
): (callback: () => void) => () => void {
  return (callback: () => void) => {
    return instance.subscribe(() => {
      const newDeps = options.dependencies(instance.state, instance);
      if (
        !hookState.manualDepsCache ||
        !shallowEqual(hookState.manualDepsCache, newDeps)
      ) {
        hookState.manualDepsCache = newDeps;
        callback();
      }
    });
  };
}

/**
 * Factory: Creates subscribe function for no-tracking mode
 */
function createNoTrackSubscribe<TBloc extends StateContainer<AnyObject>>(
  instance: TBloc,
): (callback: () => void) => () => void {
  return (callback: () => void) => instance.subscribe(callback);
}

/**
 * Factory: Creates getSnapshot function for automatic proxy tracking mode
 */
function createAutoTrackSnapshot<TBloc extends StateContainer<AnyObject>>(
  instance: TBloc,
  hookState: HookState<TBloc>,
): () => ExtractState<TBloc> {
  return () => {
    const tracker =
      hookState.tracker ||
      (hookState.tracker = createTrackerState<ExtractState<TBloc>>());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);
    }

    // Enable getter tracking during render and set as active tracker
    if (hookState.getterTracker) {
      // Capture getters from previous render (commit currentlyAccessing to trackedGetters)
      commitTrackedGetters(hookState.getterTracker);

      // Enable tracking for this render
      hookState.getterTracker.isTracking = true;

      // Set this component's tracker as the active one for this bloc
      setActiveTracker(instance, hookState.getterTracker);
    }

    startTracking(tracker);
    return createProxy(tracker, instance.state);
  };
}

/**
 * Factory: Creates getSnapshot function for manual dependencies mode
 */
function createManualDepsSnapshot<TBloc extends StateContainer<AnyObject>>(
  instance: TBloc,
  hookState: HookState<TBloc>,
  options: UseBlocOptionsWithDependencies<TBloc>,
): () => ExtractState<TBloc> {
  return () => {
    hookState.manualDepsCache = options.dependencies(instance.state, instance);
    return instance.state;
  };
}

/**
 * Factory: Creates getSnapshot function for no-tracking mode
 */
function createNoTrackSnapshot<TBloc extends StateContainer<AnyObject>>(
  instance: TBloc,
): () => ExtractState<TBloc> {
  return () => instance.state;
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
export function useBloc<TBloc extends StateContainer<AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef>({});

  const [bloc, subscribe, getSnapshot, instanceKey, hookState, rawInstance] =
    useMemo(() => {
      const isIsolated =
        (BlocClass as { isolated?: boolean }).isolated === true;
      const Constructor = BlocClass as StateContainerConstructor<TBloc>;

      // Generate instance key
      const instanceId = generateInstanceId(
        componentRef.current,
        isIsolated,
        options?.instanceId,
      );

      // Get or create bloc instance with ownership (increments ref count)
      const instance = Constructor.resolve(instanceId, options?.staticProps);

      // Determine tracking mode
      const { useManualDeps, autoTrackEnabled } =
        determineTrackingMode(options);

      // Mutable state shared between subscribe and getSnapshot
      const hookState: HookState<TBloc> = {
        tracker: null,
        manualDepsCache: null,
        getterTracker: null,
        proxiedBloc: null,
      };

      // Create subscribe and getSnapshot functions based on tracking mode
      let subscribeFn: (callback: () => void) => () => void;
      let getSnapshotFn: () => ExtractState<TBloc>;

      if (useManualDeps && options?.dependencies) {
        // Manual dependencies mode - no automatic tracking
        subscribeFn = createManualDepsSubscribe(
          instance,
          hookState,
          options as UseBlocOptionsWithDependencies<TBloc>,
        );
        getSnapshotFn = createManualDepsSnapshot(
          instance,
          hookState,
          options as UseBlocOptionsWithDependencies<TBloc>,
        );
        hookState.proxiedBloc = instance; // Use raw instance
      } else if (!autoTrackEnabled) {
        // No tracking mode
        subscribeFn = createNoTrackSubscribe(instance);
        getSnapshotFn = createNoTrackSnapshot(instance);
        hookState.proxiedBloc = instance; // Use raw instance
      } else {
        // Auto-tracking mode - enable both state and getter tracking
        subscribeFn = createAutoTrackSubscribe(instance, hookState);
        getSnapshotFn = createAutoTrackSnapshot(instance, hookState);

        // Initialize getter tracker and create proxied bloc
        hookState.getterTracker = createGetterTracker();
        hookState.proxiedBloc = createBlocProxy(instance);
      }

      return [
        hookState.proxiedBloc,
        subscribeFn,
        getSnapshotFn,
        instanceId,
        hookState,
        instance,
      ] as const;
    }, [BlocClass]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Disable getter tracking after each render and clear active tracker
  // Also invalidate render cache since this render cycle is complete
  useEffect(() => {
    if (hookState.getterTracker) {
      hookState.getterTracker.isTracking = false;
      invalidateRenderCache(hookState.getterTracker);
      clearActiveTracker(rawInstance);
    }
  });

  // Mount/unmount lifecycle
  useEffect(() => {
    // Call onMount callback if provided
    if (options?.onMount) {
      options.onMount(bloc);
    }

    return () => {
      // Call onUnmount callback if provided
      if (options?.onUnmount) {
        options.onUnmount(bloc);
      }

      // Release bloc reference
      const Constructor = BlocClass as StateContainerConstructor<TBloc>;
      Constructor.release(instanceKey);

      // For isolated instances, dispose manually since registry doesn't track them
      const isIsolated =
        (BlocClass as { isolated?: boolean }).isolated === true;
      if (isIsolated && !rawInstance.isDisposed) {
        rawInstance.dispose();
      }
    };
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>;
}
