import type { StateContainer } from '../core/StateContainer';
import {
  type ProxyTrackerState,
  createProxyTrackerState,
  startProxyTracking,
  stopProxyTracking,
  createProxyForTarget,
} from './proxy-tracker';
import { parsePath, getValueAtPath } from './path-utils';

export interface PathInfo {
  segments: string[];
  value: any;
}

export interface TrackerState<T extends any> {
  proxyTrackerState: ProxyTrackerState<T>;
  previousRenderPaths: Set<string>;
  currentRenderPaths: Set<string>;
  pathCache: Map<string, PathInfo>;
  lastCheckedState: T | null;
  lastCheckedValues: Map<string, any>;
}

function isChildPath(child: string, parent: string): boolean {
  if (child === parent) return false;
  return child.startsWith(parent + '.') || child.startsWith(parent + '[');
}

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

export function createTrackerState<T extends any>(): TrackerState<T> {
  return {
    proxyTrackerState: createProxyTrackerState<T>(),
    previousRenderPaths: new Set<string>(),
    currentRenderPaths: new Set<string>(),
    pathCache: new Map<string, PathInfo>(),
    lastCheckedState: null,
    lastCheckedValues: new Map<string, any>(),
  };
}

export function startTracking<T extends any>(
  tracker: TrackerState<T>,
): void {
  startProxyTracking(tracker.proxyTrackerState);
}

export function createProxy<T extends any>(
  tracker: TrackerState<T>,
  state: T,
): T {
  return createProxyForTarget(tracker.proxyTrackerState, state);
}

export function captureTrackedPaths<T extends any>(
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

export function hasChanges<T extends any>(
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

export function hasTrackedData<T extends any>(
  tracker: TrackerState<T>,
): boolean {
  return (
    tracker.proxyTrackerState.trackedPaths.size > 0 ||
    tracker.pathCache.size > 0 ||
    tracker.previousRenderPaths.size > 0
  );
}
