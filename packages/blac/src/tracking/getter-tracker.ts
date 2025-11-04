/**
 * Getter Tracking
 *
 * Framework-agnostic utilities for tracking computed property (getter) access
 * and detecting when getter values change. This enables fine-grained reactivity
 * for computed properties in state management.
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   createGetterTracker,
 *   createBlocProxy,
 *   hasGetterChanges
 * } from '@blac/core';
 *
 * // Create tracker
 * const tracker = createGetterTracker();
 *
 * // Create proxied bloc that tracks getter access
 * const proxiedBloc = createBlocProxy(myBloc);
 *
 * // Set active tracker before render
 * setActiveTracker(myBloc, tracker);
 *
 * // Enable tracking during render
 * tracker.isTracking = true;
 * // ... access getters on proxiedBloc ...
 * tracker.isTracking = false;
 *
 * // Commit tracked getters after render
 * commitTrackedGetters(tracker);
 *
 * // Later, check if getter values changed
 * if (hasGetterChanges(myBloc, tracker)) {
 *   // Trigger re-render
 * }
 * ```
 *
 * ## Performance Optimizations
 *
 * ### Render Cache
 * When checking if getters changed (hasGetterChanges), we compute all tracked
 * getters and store their values in a render cache. If a re-render is triggered,
 * the cached values are reused during render instead of recomputing. This ensures
 * each getter is computed at most once per render cycle.
 *
 * ### Descriptor Cache
 * Property descriptors are cached per class to avoid repeated prototype chain walks.
 * This is critical for performance since we need to distinguish getters from methods.
 *
 * ### Proxy Cache
 * Proxied blocs are cached per instance. Multiple components sharing the same bloc
 * will get the same proxy instance. Each component sets its tracker in activeTrackerMap
 * before render, and the proxy looks it up.
 */

import type { StateContainer } from '../core/StateContainer';
import type { AnyObject } from '../types/branded';

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
 *
 * PERFORMANCE: Render cache optimization
 * - When checking if we should re-render (hasGetterChanges), we compute all getters
 * - Store these computed values in `renderCache` for the upcoming render
 * - During render, if we access a cached getter, use the cached value instead of recomputing
 * - This ensures each getter is computed at most once per render cycle
 * - Cache is invalidated after render completes or when state changes again
 */
export interface GetterTrackerState {
  /** Map of getter names to their last computed values (for comparison) */
  trackedValues: Map<string | symbol, unknown>;
  /** Temporary set of getters being accessed during current render */
  currentlyAccessing: Set<string | symbol>;
  /** Committed set of getters from last completed render (used for change detection) */
  trackedGetters: Set<string | symbol>;
  /** Flag to enable/disable tracking (only enabled during render phase) */
  isTracking: boolean;
  /** Cache of getter values computed during hasGetterChanges (valid for current render cycle) */
  renderCache: Map<string | symbol, unknown>;
  /** Flag indicating render cache is valid and can be used */
  cacheValid: boolean;
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
const activeTrackerMap = new WeakMap<StateContainer<any>, GetterTrackerState>();

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
export function getDescriptor(
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
export function isGetter(obj: any, prop: string | symbol): boolean {
  const descriptor = getDescriptor(obj, prop);
  return descriptor?.get !== undefined;
}

/**
 * Create a new getter tracking state
 *
 * @returns A new GetterTrackerState initialized with empty collections
 */
export function createGetterTracker(): GetterTrackerState {
  return {
    trackedValues: new Map(),
    currentlyAccessing: new Set(),
    trackedGetters: new Set(),
    isTracking: false,
    renderCache: new Map(),
    cacheValid: false,
  };
}

/**
 * Set the active tracker for a bloc instance
 *
 * @remarks
 * This should be called before rendering to associate a tracker with a bloc.
 * The proxy will look up this tracker to know where to record accessed getters.
 *
 * @param bloc - The bloc instance
 * @param tracker - The getter tracker to associate with the bloc
 */
export function setActiveTracker<TBloc extends StateContainer<AnyObject>>(
  bloc: TBloc,
  tracker: GetterTrackerState,
): void {
  activeTrackerMap.set(bloc, tracker);
}

/**
 * Clear the active tracker for a bloc instance
 *
 * @remarks
 * This should be called after rendering is complete to clean up the association.
 *
 * @param bloc - The bloc instance
 */
export function clearActiveTracker<TBloc extends StateContainer<AnyObject>>(
  bloc: TBloc,
): void {
  activeTrackerMap.delete(bloc);
}

/**
 * Get the active tracker for a bloc instance
 *
 * @param bloc - The bloc instance
 * @returns The active tracker if set, undefined otherwise
 */
export function getActiveTracker<TBloc extends StateContainer<AnyObject>>(
  bloc: TBloc,
): GetterTrackerState | undefined {
  return activeTrackerMap.get(bloc);
}

/**
 * Commit tracked getters from current render to the tracked set
 *
 * @remarks
 * This should be called after each render to record which getters were accessed.
 * It moves getters from `currentlyAccessing` to `trackedGetters` and clears
 * the temporary set.
 *
 * @param tracker - The getter tracker
 */
export function commitTrackedGetters(tracker: GetterTrackerState): void {
  if (tracker.currentlyAccessing.size > 0) {
    tracker.trackedGetters = new Set(tracker.currentlyAccessing);
  }
  tracker.currentlyAccessing.clear();
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
 * @param bloc - The bloc instance to wrap
 * @returns A proxied bloc that tracks getter access
 */
export function createBlocProxy<TBloc extends StateContainer<AnyObject>>(
  bloc: TBloc,
): TBloc {
  // Check cache first - return existing proxy if available
  const cached = blocProxyCache.get(bloc);
  if (cached) {
    return cached;
  }

  const proxy = new Proxy(bloc, {
    get(target, prop, receiver) {
      // Get the active tracker for this bloc (set by the framework adapter)
      const tracker = activeTrackerMap.get(target);

      // Only track during render phase (when tracker is active and tracking enabled)
      if (tracker?.isTracking && isGetter(target, prop)) {
        // Record that this getter was accessed during current render
        tracker.currentlyAccessing.add(prop);

        // Use cached value if available from previous change detection
        if (tracker.cacheValid && tracker.renderCache.has(prop)) {
          const cachedValue = tracker.renderCache.get(prop);
          // Also store in trackedValues for consistency
          tracker.trackedValues.set(prop, cachedValue);
          return cachedValue;
        }

        // Compute getter if no cache available (first access or cache invalidated)
        const descriptor = getDescriptor(target, prop);
        const value = descriptor!.get!.call(target);
        tracker.trackedValues.set(prop, value);
        return value;
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
 * OPTIMIZATION: Render cache population
 * - Computes ALL tracked getters (no early exit) to populate the render cache
 * - This ensures each getter is computed only once per render cycle
 * - If we're going to re-render, getters accessed during render will use cached values
 * - Cache is populated even if no changes detected (useful for parent-triggered re-renders)
 * - Trade-off: Give up early exit to ensure full cache population
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
export function hasGetterChanges<TBloc extends StateContainer<AnyObject>>(
  bloc: TBloc,
  tracker: GetterTrackerState | null,
): boolean {
  // Early return if no tracker or no getters tracked
  if (!tracker || tracker.trackedGetters.size === 0) {
    return false;
  }

  // Clear previous render cache
  tracker.renderCache.clear();

  let hasAnyChange = false;

  // Compute all getters to populate render cache (no early exit)
  for (const prop of tracker.trackedGetters) {
    try {
      const descriptor = getDescriptor(bloc, prop);
      if (!descriptor?.get) {
        // Getter no longer exists (shouldn't happen, but be defensive)
        continue;
      }

      const newValue = descriptor.get.call(bloc);
      const oldValue = tracker.trackedValues.get(prop);

      // Store in render cache for upcoming render (even if unchanged)
      tracker.renderCache.set(prop, newValue);

      // Update tracked values for next comparison
      tracker.trackedValues.set(prop, newValue);

      // Use Object.is for reference equality comparison
      if (!Object.is(newValue, oldValue)) {
        hasAnyChange = true;
        // Don't return early - continue computing and caching remaining getters
      }
    } catch (error) {
      // Getter threw an error during comparison
      console.warn(
        `[BlaC] Getter "${String(prop)}" threw error during change detection. Stopping tracking for this getter.`,
        error,
      );

      // Stop tracking this getter
      tracker.trackedGetters.delete(prop);
      tracker.trackedValues.delete(prop);

      // Treat as "changed" to trigger re-render
      // Still return early on error to avoid cascading failures
      tracker.cacheValid = false; // Invalidate cache due to error
      return true;
    }
  }

  // Mark cache as valid for the upcoming render
  tracker.cacheValid = true;

  return hasAnyChange;
}

/**
 * Invalidate the render cache for a tracker
 *
 * @remarks
 * This should be called after render completes to prevent stale cache values
 * from being used in the next render cycle.
 *
 * @param tracker - The getter tracker
 */
export function invalidateRenderCache(tracker: GetterTrackerState): void {
  tracker.cacheValid = false;
}

/**
 * Reset all tracking state for a tracker
 *
 * @remarks
 * Clears all tracked getters, values, and caches. Useful for cleanup or reset.
 *
 * @param tracker - The getter tracker
 */
export function resetGetterTracker(tracker: GetterTrackerState): void {
  tracker.trackedValues.clear();
  tracker.currentlyAccessing.clear();
  tracker.trackedGetters.clear();
  tracker.renderCache.clear();
  tracker.cacheValid = false;
  tracker.isTracking = false;
}
