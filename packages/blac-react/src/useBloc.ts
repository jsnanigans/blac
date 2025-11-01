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
} from '@blac/core';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';

/**
 * StateContainer constructor with required static methods
 */
type StateContainerConstructor<TBloc extends StateContainer<any>> =
  BlocConstructor<TBloc> & {
    getOrCreate(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

// ============================================================================
// Getter Tracking Infrastructure
// ============================================================================

/**
 * State for tracking getter access and values during render
 *
 * @remarks
 * This tracks which getters are accessed during component render and stores
 * their computed values for comparison on subsequent state changes.
 * Only getters (properties with a getter descriptor) are tracked automatically.
 *
 * Similar to state tracking, we use two sets:
 * - `currentlyAccessing`: Temporary set for getters accessed during current render
 * - `trackedGetters`: Committed set of getters from last completed render
 */
interface GetterTrackingState {
  /** Map of getter names to their last computed values (for comparison) */
  trackedValues: Map<string | symbol, unknown>;
  /** Temporary set of getters being accessed during current render */
  currentlyAccessing: Set<string | symbol>;
  /** Committed set of getters from last completed render (used for change detection) */
  trackedGetters: Set<string | symbol>;
  /** Flag to enable/disable tracking (only enabled during render phase) */
  isTracking: boolean;
}

/**
 * Cache for property descriptors to avoid repeated prototype chain walks
 * Maps from object constructor to a map of property name to descriptor
 */
const descriptorCache = new WeakMap<
  Function,
  Map<string | symbol, PropertyDescriptor | undefined>
>();

/**
 * Cache for proxied blocs to ensure same proxy is returned for same bloc instance
 * This is important for identity checks (e.g., bloc1 === bloc2) across components
 * using the same shared bloc instance.
 */
const blocProxyCache = new WeakMap<StateContainer<any>, any>();

/**
 * Map to store the currently active tracker during render.
 * This allows the cached proxy to know which component's tracker to use.
 * Set before render, cleared after render.
 */
const activeTrackerMap = new WeakMap<StateContainer<any>, GetterTrackingState>();

/**
 * Get property descriptor for a given property, with caching
 *
 * @remarks
 * Walks up the prototype chain once per class to find the descriptor,
 * then caches the result for performance. This is critical because
 * we need to distinguish getters from methods and properties.
 *
 * @param obj - The object to get the descriptor from
 * @param prop - The property name or symbol
 * @returns The property descriptor if found, undefined otherwise
 */
function getDescriptor(
  obj: any,
  prop: string | symbol,
): PropertyDescriptor | undefined {
  const constructor = obj.constructor;

  // Try to get from cache
  let constructorCache = descriptorCache.get(constructor);
  if (constructorCache?.has(prop)) {
    return constructorCache.get(prop);
  }

  // Walk prototype chain to find descriptor
  let current = obj;
  let descriptor: PropertyDescriptor | undefined;

  while (current && current !== Object.prototype) {
    descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) {
      break;
    }
    current = Object.getPrototypeOf(current);
  }

  // Cache the result
  if (!constructorCache) {
    constructorCache = new Map();
    descriptorCache.set(constructor, constructorCache);
  }
  constructorCache.set(prop, descriptor);

  return descriptor;
}

/**
 * Check if a property is a getter (has a getter descriptor)
 *
 * @param obj - The object to check
 * @param prop - The property name or symbol
 * @returns True if the property is a getter, false otherwise
 */
function isGetter(obj: any, prop: string | symbol): boolean {
  const descriptor = getDescriptor(obj, prop);
  return descriptor?.get !== undefined;
}

/**
 * Create a new getter tracking state
 *
 * @returns A new GetterTrackingState initialized with empty collections
 */
function createGetterTracker(): GetterTrackingState {
  return {
    trackedValues: new Map(),
    currentlyAccessing: new Set(),
    trackedGetters: new Set(),
    isTracking: false,
  };
}

/**
 * Create a proxy that intercepts getter access on a bloc instance
 *
 * @remarks
 * This proxy wraps the bloc instance to track which getters are accessed
 * during component render. When tracking is enabled (during render phase),
 * it records accessed getters and stores their computed values for later
 * comparison.
 *
 * IMPORTANT: This function caches proxies per bloc instance. Multiple components
 * sharing the same bloc will get the same proxy instance. Each component sets
 * its tracker in activeTrackerMap before render, and the proxy looks it up.
 *
 * Error handling: If a getter throws an error, we still track that it was
 * accessed and let the error propagate to React's error boundary.
 *
 * @param bloc - The bloc instance to wrap
 * @returns A proxied bloc that tracks getter access
 */
function createBlocProxy<TBloc extends StateContainer<AnyObject>>(
  bloc: TBloc,
): TBloc {
  // Check cache first - return existing proxy if available
  const cached = blocProxyCache.get(bloc);
  if (cached) {
    return cached;
  }

  const proxy = new Proxy(bloc, {
    get(target, prop, receiver) {
      // Get the active tracker for this bloc (set by getSnapshot)
      const tracker = activeTrackerMap.get(target);

      // Only track during render phase (when tracker is active and tracking enabled)
      if (tracker?.isTracking && isGetter(target, prop)) {
        // Record that this getter was accessed during current render
        tracker.currentlyAccessing.add(prop);

        // Compute and store the getter value
        try {
          const descriptor = getDescriptor(target, prop);
          const value = descriptor!.get!.call(target);
          tracker.trackedValues.set(prop, value);
          return value;
        } catch (error) {
          // Still track the getter, but let error propagate
          // Error will be caught by React's error boundary
          throw error;
        }
      }

      // Default behavior for non-getters or when tracking disabled
      return Reflect.get(target, prop, receiver);
    },
  });

  blocProxyCache.set(bloc, proxy);
  return proxy;
}

/**
 * Check if any tracked getters have changed values
 *
 * @remarks
 * Re-computes all getters that were accessed during the last render and
 * compares their new values with stored values using Object.is() (reference
 * equality).
 *
 * Error handling: If a getter throws during re-computation, we log a warning,
 * stop tracking that specific getter, and treat it as "changed" to trigger
 * a re-render. This prevents the tracking system from breaking while still
 * allowing React's error boundary to handle the error on the next render.
 *
 * @param bloc - The bloc instance
 * @param tracker - The getter tracking state
 * @returns True if any tracked getter value changed, false otherwise
 */
function hasGetterChanges<TBloc extends StateContainer<AnyObject>>(
  bloc: TBloc,
  tracker: GetterTrackingState | null,
): boolean {
  // Early return if no tracker or no getters tracked
  if (!tracker || tracker.trackedGetters.size === 0) {
    return false;
  }

  // Check each tracked getter for changes
  for (const prop of tracker.trackedGetters) {
    try {
      const descriptor = getDescriptor(bloc, prop);
      if (!descriptor?.get) {
        // Getter no longer exists (shouldn't happen, but be defensive)
        continue;
      }

      const newValue = descriptor.get.call(bloc);
      const oldValue = tracker.trackedValues.get(prop);

      // Use Object.is for reference equality comparison
      if (!Object.is(newValue, oldValue)) {
        // Update stored value
        tracker.trackedValues.set(prop, newValue);
        return true;
      }
    } catch (error) {
      // Getter threw an error during comparison
      console.warn(
        `[useBloc] Getter "${String(prop)}" threw error during change detection. Stopping tracking for this getter.`,
        error,
      );

      // Stop tracking this getter
      tracker.trackedGetters.delete(prop);
      tracker.trackedValues.delete(prop);

      // Treat as "changed" to trigger re-render
      return true;
    }
  }

  return false;
}

// ============================================================================
// Hook Support Functions
// ============================================================================

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
  getterTracker: GetterTrackingState | null;
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

      // Check both state property changes and getter changes
      let stateChanged = hasChanges(tracker, instance.state);
      const getterChanged = hasGetterChanges(instance, hookState.getterTracker);

      // Special case: if NO state properties were tracked (pathCache.size === 0)
      // but getters WERE tracked, then don't treat "no state tracking" as "track everything".
      // Only rely on getter changes in this case.
      if (tracker.pathCache.size === 0 && hookState.getterTracker && hookState.getterTracker.trackedGetters.size > 0) {
        stateChanged = false; // Override - only getters are relevant
      }

      if (stateChanged || getterChanged) {
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
  options: UseBlocOptions<TBloc>,
): (callback: () => void) => () => void {
  return (callback: () => void) => {
    return instance.subscribe(() => {
      const newDeps = options.dependencies!(instance.state, instance);
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
      if (hookState.getterTracker.currentlyAccessing.size > 0) {
        hookState.getterTracker.trackedGetters = new Set(hookState.getterTracker.currentlyAccessing);
      }

      // Clear and enable tracking for this render
      hookState.getterTracker.currentlyAccessing.clear();
      hookState.getterTracker.isTracking = true;

      // Set this component's tracker as the active one for this bloc
      activeTrackerMap.set(instance, hookState.getterTracker);
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
  options: UseBlocOptions<TBloc>,
): () => ExtractState<TBloc> {
  return () => {
    hookState.manualDepsCache = options.dependencies!(instance.state, instance);
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

  const [bloc, subscribe, getSnapshot, instanceKey, hookState, rawInstance] = useMemo(() => {
    const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    // Generate instance key
    const instanceId = generateInstanceId(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    // Get or create bloc instance
    const instance = Constructor.getOrCreate(instanceId, options?.staticProps);

    // Determine tracking mode
    const { useManualDeps, autoTrackEnabled } = determineTrackingMode(options);

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

    if (useManualDeps) {
      // Manual dependencies mode - no automatic tracking
      subscribeFn = createManualDepsSubscribe(instance, hookState, options!);
      getSnapshotFn = createManualDepsSnapshot(instance, hookState, options!);
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

    return [hookState.proxiedBloc!, subscribeFn, getSnapshotFn, instanceId, hookState, instance] as const;
  }, [BlocClass]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Disable getter tracking after each render and clear active tracker
  useEffect(() => {
    if (hookState.getterTracker) {
      hookState.getterTracker.isTracking = false;
      activeTrackerMap.delete(rawInstance);
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
