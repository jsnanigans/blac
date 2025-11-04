/**
 * Dependency tracking for state management
 *
 * Provides high-level dependency tracking that combines proxy tracking with
 * change detection to determine when a component needs to re-render.
 */

import type { AnyObject } from '../types/branded';
import {
  type ProxyTrackerState,
  createProxyTrackerState,
  startProxyTracking,
  stopProxyTracking,
  createProxyForTarget,
} from './proxy-tracker';
import { parsePath, getValueAtPath } from './path-utils';

/**
 * Information about a tracked path
 */
export interface PathInfo {
  /** Parsed path segments */
  segments: string[];
  /** Last known value at this path */
  value: any;
}

/**
 * State for dependency tracking
 */
export interface TrackerState<T extends AnyObject> {
  /** Internal proxy tracker state */
  proxyTrackerState: ProxyTrackerState<T>;
  /** Paths tracked in the previous render */
  previousRenderPaths: Set<string>;
  /** Paths tracked in the current render */
  currentRenderPaths: Set<string>;
  /** Cache of parsed paths and their values */
  pathCache: Map<string, PathInfo>;
  /** Last state object that was checked for changes */
  lastCheckedState: T | null;
  /** Values from the last change check (optimization) */
  lastCheckedValues: Map<string, any>;
}

/**
 * Check if one path is a child of another path
 *
 * @example
 * isChildPath('user.name', 'user') // true
 * isChildPath('user.profile.bio', 'user.profile') // true
 * isChildPath('items[0]', 'items') // true
 * isChildPath('user.name', 'user.profile') // false
 */
function isChildPath(child: string, parent: string): boolean {
  if (child === parent) return false;
  return child.startsWith(parent + '.') || child.startsWith(parent + '[');
}

/**
 * Optimize tracked paths by removing redundant parent paths
 *
 * This implements fine-grained tracking by keeping only the most specific
 * paths accessed. For example, if 'user.profile.bio' is accessed, we don't
 * need to track 'user' or 'user.profile' as those are redundant.
 *
 * @example
 * // Single deep access
 * optimizeTrackedPaths(['user', 'user.profile', 'user.profile.bio'])
 * // Returns: ['user.profile.bio']
 *
 * // Multiple siblings
 * optimizeTrackedPaths(['user', 'user.name', 'user.age'])
 * // Returns: ['user.name', 'user.age']
 *
 * // Mixed depths
 * optimizeTrackedPaths(['user', 'user.profile', 'user.profile.bio', 'user.name'])
 * // Returns: ['user.profile.bio', 'user.name']
 */
export function optimizeTrackedPaths(paths: Set<string>): Set<string> {
  if (paths.size === 0) {
    return new Set();
  }

  if (paths.size === 1) {
    return new Set(paths);
  }

  // Sort paths by length descending (longest/most specific first)
  const sortedPaths = Array.from(paths).sort((a, b) => b.length - a.length);
  const optimized = new Set<string>();

  for (const path of sortedPaths) {
    // Check if we already have a more specific child path
    let hasMoreSpecificChild = false;

    for (const optimizedPath of optimized) {
      if (isChildPath(optimizedPath, path)) {
        hasMoreSpecificChild = true;
        break;
      }
    }

    // Only add this path if we don't have a more specific version
    if (!hasMoreSpecificChild) {
      optimized.add(path);
    }
  }

  return optimized;
}

/**
 * Create a new tracker state
 */
export function createTrackerState<T extends AnyObject>(): TrackerState<T> {
  return {
    proxyTrackerState: createProxyTrackerState<T>(),
    previousRenderPaths: new Set<string>(),
    currentRenderPaths: new Set<string>(),
    pathCache: new Map<string, PathInfo>(),
    lastCheckedState: null,
    lastCheckedValues: new Map<string, any>(),
  };
}

/**
 * Start tracking property accesses
 */
export function startTracking<T extends AnyObject>(
  tracker: TrackerState<T>,
): void {
  startProxyTracking(tracker.proxyTrackerState);
}

/**
 * Create a proxy for the given state
 */
export function createProxy<T extends AnyObject>(
  tracker: TrackerState<T>,
  state: T,
): T {
  return createProxyForTarget(tracker.proxyTrackerState, state);
}

/**
 * Capture the paths that were tracked during a render
 *
 * This should be called after each render to record which paths were accessed.
 * Uses fine-grained optimization to remove redundant parent paths, keeping only
 * the most specific paths that were accessed.
 */
export function captureTrackedPaths<T extends AnyObject>(
  tracker: TrackerState<T>,
  state: T,
): void {
  tracker.previousRenderPaths = tracker.currentRenderPaths;

  // Get raw tracked paths and optimize them (remove redundant parents)
  const rawPaths = stopProxyTracking(tracker.proxyTrackerState);
  tracker.currentRenderPaths = optimizeTrackedPaths(rawPaths);

  if (
    tracker.previousRenderPaths.size === 0 &&
    tracker.currentRenderPaths.size === 0
  ) {
    return;
  }

  const trackedPathsUnion = new Set(tracker.previousRenderPaths);
  for (const path of tracker.currentRenderPaths) {
    trackedPathsUnion.add(path);
  }

  const canReuseCache = tracker.lastCheckedState === state;

  for (const path of trackedPathsUnion) {
    if (!tracker.pathCache.has(path)) {
      const segments = parsePath(path);
      const value =
        canReuseCache && tracker.lastCheckedValues.has(path)
          ? tracker.lastCheckedValues.get(path)
          : getValueAtPath(state, segments);

      tracker.pathCache.set(path, { segments, value });
    } else {
      const info = tracker.pathCache.get(path)!;
      info.value =
        canReuseCache && tracker.lastCheckedValues.has(path)
          ? tracker.lastCheckedValues.get(path)
          : getValueAtPath(state, info.segments);
    }
  }

  tracker.lastCheckedValues.clear();
}

/**
 * Check if any tracked paths have changed
 *
 * This is called when state changes to determine if a re-render is needed.
 * Returns true if any tracked path has a different value than before.
 */
export function hasChanges<T extends AnyObject>(
  tracker: TrackerState<T>,
  state: T,
): boolean {
  if (tracker.pathCache.size === 0) {
    return true;
  }

  tracker.lastCheckedValues.clear();

  for (const [path, info] of tracker.pathCache.entries()) {
    const currentValue = getValueAtPath(state, info.segments);
    tracker.lastCheckedValues.set(path, currentValue);

    if (!Object.is(currentValue, info.value)) {
      tracker.lastCheckedState = state;
      return true;
    }
  }

  tracker.lastCheckedState = state;
  return false;
}

/**
 * Check if tracker has any tracked data
 *
 * Returns true if there are any tracked paths or cached paths.
 */
export function hasTrackedData<T extends AnyObject>(
  tracker: TrackerState<T>,
): boolean {
  return (
    tracker.proxyTrackerState.trackedPaths.size > 0 ||
    tracker.pathCache.size > 0 ||
    tracker.previousRenderPaths.size > 0
  );
}
