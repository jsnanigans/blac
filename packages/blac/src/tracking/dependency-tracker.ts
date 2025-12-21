import {
  type ProxyState,
  createProxyState,
  startProxy,
  stopProxy,
  createForTarget,
} from './proxy-tracker';
import { parsePath, getValueAtPath } from './path-utils';

/**
 * @internal
 */
export interface PathInfo {
  segments: string[];
  value: any;
}

/**
 * @internal
 */
export interface DependencyState<T> {
  proxyState: ProxyState<T>;
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

/**
 * Extract the parent array path from an array child path
 * Examples:
 *   'messages.length' -> 'messages'
 *   'messages[0]' -> 'messages'
 *   'messages[0].text' -> 'messages'
 *   'data.items[0]' -> 'data.items'
 */
function getArrayParentPath(path: string): string | null {
  // Check if path ends with .length
  if (path.endsWith('.length')) {
    return path.slice(0, -7); // Remove '.length'
  }

  // Check if path contains array indexing [n]
  const arrayIndexMatch = path.match(/^(.+?)\[\d+\]/);
  if (arrayIndexMatch) {
    return arrayIndexMatch[1];
  }

  return null;
}

/**
 * @internal
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

  // IMPORTANT: Add array parent paths back to track array reference changes
  // When we track array children (e.g., 'messages.length' or 'messages[0]'),
  // we must also track the array itself because:
  // 1. Array methods like .map() track the array path
  // 2. The array reference can change even when length/elements stay the same
  // 3. Callback parameters in .map() receive raw elements (not proxies)
  const arrayParents = new Set<string>();
  for (const path of optimized) {
    const arrayParent = getArrayParentPath(path);
    if (arrayParent) {
      arrayParents.add(arrayParent);
    }
  }

  // Add array parent paths to the optimized set
  for (const arrayParent of arrayParents) {
    optimized.add(arrayParent);
  }

  return optimized;
}

/**
 * @internal
 */
export function createDependencyState<T>(): DependencyState<T> {
  return {
    proxyState: createProxyState<T>(),
    previousRenderPaths: new Set<string>(),
    currentRenderPaths: new Set<string>(),
    pathCache: new Map<string, PathInfo>(),
    lastCheckedState: null,
    lastCheckedValues: new Map<string, any>(),
  };
}

/**
 * @internal
 */
export function startDependency<T>(tracker: DependencyState<T>): void {
  startProxy(tracker.proxyState);
}

/**
 * @internal
 */
export function createDependencyProxy<T>(tracker: DependencyState<T>, state: T): T {
  return createForTarget(tracker.proxyState, state);
}

/**
 * @internal
 */
export function capturePaths<T>(
  tracker: DependencyState<T>,
  state: T,
): void {
  tracker.previousRenderPaths = tracker.currentRenderPaths;

  // Get raw tracked paths and optimize them (remove redundant parents)
  const rawPaths = stopProxy(tracker.proxyState);
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
 * @internal
 */
export function hasDependencyChanges<T>(tracker: DependencyState<T>, state: T): boolean {
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
 * @internal
 */
export function hasTrackedData<T>(tracker: DependencyState<T>): boolean {
  return (
    tracker.proxyState.trackedPaths.size > 0 ||
    tracker.pathCache.size > 0 ||
    tracker.previousRenderPaths.size > 0
  );
}
