import { useMemo, useSyncExternalStore } from 'react';
import { type AnyObject, type BlocConstructor, StateContainer, type ExtractState } from '@blac/core';

// ============================================================================
// Functional ProxyTracker Implementation
// ============================================================================

// Lifecycle: Called during render when accessing nested state properties
function isProxyable(value: unknown): value is object {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === Array.prototype;
}

interface ProxyTrackerState<T> {
  trackedPaths: Set<string>;
  isTracking: boolean;
  proxyCache: WeakMap<object, any>;
  boundFunctionsCache: WeakMap<Function, Function> | null;
  lastProxiedState: T | null;
  lastProxy: T | null;
  maxDepth: number;
}

const ARRAY_METHODS = new Set(['map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce']);

// Lifecycle: Called once during initial mount (lazy, inside getTracker)
function createProxyTrackerState<T>(): ProxyTrackerState<T> {
  return {
    trackedPaths: new Set<string>(),
    isTracking: false,
    proxyCache: new WeakMap<object, any>(),
    boundFunctionsCache: null,
    lastProxiedState: null,
    lastProxy: null,
    maxDepth: 10,
  };
}

// Lifecycle: Called before each render (in getSnapshot)
function startProxyTracking<T>(state: ProxyTrackerState<T>): void {
  state.isTracking = true;
  state.trackedPaths.clear();
}

// Lifecycle: Called after each render (in captureTrackedPaths)
function stopProxyTracking<T>(state: ProxyTrackerState<T>): Set<string> {
  state.isTracking = false;
  return new Set(state.trackedPaths);
}

// Lifecycle: Called once per new tracked path (in captureTrackedPaths)
function parsePath(path: string): string[] {
  const segments: string[] = [];
  let current = '';
  let i = 0;

  while (i < path.length) {
    const char = path[i];
    if (char === '.') {
      if (current) segments.push(current);
      current = '';
    } else if (char === '[') {
      if (current) segments.push(current);
      current = '';
      // Skip bracket
      i++;
      // Read until ]
      while (i < path.length && path[i] !== ']') {
        current += path[i++];
      }
      if (current) segments.push(current);
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  if (current) segments.push(current);
  return segments;
}

// Lifecycle: Called during render when accessing array properties
function createArrayProxy<T, U>(
  state: ProxyTrackerState<T>,
  target: U[],
  path: string,
  depth: number = 0
): U[] {
  const proxy = new Proxy(target, {
    get: (arr, prop: string | symbol) => {
      if (typeof prop === 'symbol') {
        return Reflect.get(arr, prop);
      }

      const value = Reflect.get(arr, prop);

      if (typeof value === 'function') {
        if (ARRAY_METHODS.has(prop)) {
          if (state.isTracking && path) {
            state.trackedPaths.add(path);
          }
        }

        if (!state.boundFunctionsCache) {
          state.boundFunctionsCache = new WeakMap<Function, Function>();
        }
        const cached = state.boundFunctionsCache.get(value);
        if (cached) {
          return cached;
        }
        const bound = value.bind(arr);
        state.boundFunctionsCache.set(value, bound);
        return bound;
      }

      let fullPath: string;
      if (prop === 'length') {
        fullPath = path ? `${path}.length` : 'length';
      } else if (typeof prop === 'string') {
        const index = Number(prop);
        if (!isNaN(index) && index >= 0) {
          fullPath = path ? `${path}[${index}]` : `[${index}]`;
        } else {
          fullPath = path ? `${path}.${prop}` : prop;
        }
      } else {
        return value;
      }

      if (isProxyable(value)) {
        return createProxyInternal(state, value as T, fullPath, depth + 1);
      }

      if (state.isTracking) {
        state.trackedPaths.add(fullPath);
      }

      return value;
    },
  });

  state.proxyCache.set(target, proxy);
  return proxy;
}

// Lifecycle: Called during render when accessing object/array properties (recursive)
function createProxyInternal<T>(
  state: ProxyTrackerState<T>,
  target: T,
  path: string = '',
  depth: number = 0
): T {
  if (!state.isTracking || !isProxyable(target)) {
    return target;
  }

  if (depth >= state.maxDepth) {
    return target;
  }

  if (state.proxyCache.has(target)) {
    return state.proxyCache.get(target);
  }

  if (Array.isArray(target)) {
    return createArrayProxy(
      state,
      target as unknown as any[],
      path,
      depth,
    ) as unknown as T;
  }

  const proxy = new Proxy(target, {
    get: (obj, prop: string | symbol) => {
      if (typeof prop === 'symbol') {
        return Reflect.get(obj, prop);
      }

      const value = Reflect.get(obj, prop);

      if (typeof value === 'function') {
        if (!state.boundFunctionsCache) {
          state.boundFunctionsCache = new WeakMap<Function, Function>();
        }
        const cached = state.boundFunctionsCache.get(value);
        if (cached) {
          return cached;
        }
        const bound = value.bind(obj);
        state.boundFunctionsCache.set(value, bound);
        return bound;
      }

      const fullPath = path ? `${path}.${String(prop)}` : String(prop);

      if (isProxyable(value)) {
        const proxiedValue = createProxyInternal(state, value as T, fullPath, depth + 1);
        return proxiedValue;
      }

      if (typeof prop === 'string' && state.isTracking) {
        if (!prop.startsWith('_') && !prop.startsWith('$$')) {
          state.trackedPaths.add(fullPath);
        }
      }

      return value;
    },

    has: (obj, prop: string | symbol) => {
      if (typeof prop === 'string' && state.isTracking) {
        const fullPath = path ? `${path}.${prop}` : prop;
        state.trackedPaths.add(fullPath);
      }
      return Reflect.has(obj, prop);
    },

    ownKeys: (obj) => {
      if (state.isTracking && path) {
        state.trackedPaths.add(path);
      }
      return Reflect.ownKeys(obj);
    },
  });

  state.proxyCache.set(target, proxy);
  return proxy as T;
}

// Lifecycle: Called before each render (in getSnapshot) - caches proxy if state unchanged
function createProxyForTarget<T>(
  state: ProxyTrackerState<T>,
  target: T
): T {
  if (state.lastProxiedState === target && state.lastProxy) {
    return state.lastProxy;
  }

  const proxy = createProxyInternal(state, target, '', 0);
  state.lastProxiedState = target;
  state.lastProxy = proxy;
  return proxy;
}

// ============================================================================
// End Functional ProxyTracker Implementation
// ============================================================================

interface PathInfo {
  segments: string[];
  value: any;
}

interface TrackerState<T extends AnyObject> {
  proxyTrackerState: ProxyTrackerState<T>;
  previousRenderPaths: Set<string>;
  currentRenderPaths: Set<string>;
  pathCache: Map<string, PathInfo>;
  lastCheckedState: T | null;
  lastCheckedValues: Map<string, any>;
  cleanupCounter: number;
}

const CLEANUP_INTERVAL = 10;

// Lifecycle: Called once during initial mount (lazy, inside getTracker)
function createTrackerState<T extends AnyObject>(): TrackerState<T> {
  return {
    proxyTrackerState: createProxyTrackerState<T>(),
    previousRenderPaths: new Set<string>(),
    currentRenderPaths: new Set<string>(),
    pathCache: new Map<string, PathInfo>(),
    lastCheckedState: null,
    lastCheckedValues: new Map<string, any>(),
    cleanupCounter: 0,
  };
}

// Lifecycle: Called before each render (in getSnapshot)
function startTracking<T extends AnyObject>(tracker: TrackerState<T>): void {
  startProxyTracking(tracker.proxyTrackerState);
}

// Lifecycle: Called before each render (in getSnapshot)
function createProxy<T extends AnyObject>(tracker: TrackerState<T>, state: T): T {
  return createProxyForTarget(tracker.proxyTrackerState, state);
}

// Lifecycle: Called in hasChanges and captureTrackedPaths to traverse state
function getValueAtPath(obj: any, segments: string[]): any {
  if (obj == null) return undefined;

  let current = obj;
  for (let i = 0; i < segments.length; i++) {
    current = current[segments[i]];
    if (current == null) return undefined;
  }
  return current;
}

// Lifecycle: Called after each render in getSnapshot (captures accessed paths)
function captureTrackedPaths<T extends AnyObject>(
  tracker: TrackerState<T>,
  state: T
): void {
  tracker.previousRenderPaths = tracker.currentRenderPaths;
  tracker.currentRenderPaths = stopProxyTracking(tracker.proxyTrackerState);

  if (tracker.previousRenderPaths.size === 0 && tracker.currentRenderPaths.size === 0) {
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
      const value = canReuseCache && tracker.lastCheckedValues.has(path)
        ? tracker.lastCheckedValues.get(path)
        : getValueAtPath(state, segments);

      tracker.pathCache.set(path, { segments, value });
    } else {
      const info = tracker.pathCache.get(path)!;
      info.value = canReuseCache && tracker.lastCheckedValues.has(path)
        ? tracker.lastCheckedValues.get(path)
        : getValueAtPath(state, info.segments);
    }
  }

  tracker.cleanupCounter++;
  if (tracker.cleanupCounter >= CLEANUP_INTERVAL) {
    tracker.cleanupCounter = 0;
    for (const path of tracker.pathCache.keys()) {
      if (!trackedPathsUnion.has(path)) {
        tracker.pathCache.delete(path);
      }
    }
  }

  tracker.lastCheckedValues.clear();
}

// Lifecycle: Called on state change (in subscribe callback) to check if re-render needed
function hasChanges<T extends AnyObject>(
  tracker: TrackerState<T>,
  state: T
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
export function useBlocFunctional<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>
): [ExtractState<TBloc>, TBloc] {
  const [bloc, subscribe, getSnapshot] = useMemo(() => {
    const instance = (BlocClass as any).instance ?? new BlocClass();
    let tracker: TrackerState<ExtractState<TBloc>> | null = null;

    const getTracker = (): TrackerState<ExtractState<TBloc>> => {
      if (!tracker) {
        tracker = createTrackerState<ExtractState<TBloc>>();
      }
      return tracker;
    };

    const subscribeFn = (callback: () => void) => {
      return instance.subscribe(() => {
        if (hasChanges(getTracker(), instance.state)) {
          callback();
        }
      });
    };

    const getSnapshotFn = (): ExtractState<TBloc> => {
      const tracker = getTracker();

      const hasTrackedData = tracker.proxyTrackerState.trackedPaths.size > 0 ||
                             tracker.pathCache.size > 0 ||
                             tracker.previousRenderPaths.size > 0;

      if (hasTrackedData) {
        captureTrackedPaths(tracker, instance.state);
      }

      startTracking(tracker);
      return createProxy(tracker, instance.state);
    };

    return [instance, subscribeFn, getSnapshotFn] as const;
  }, [BlocClass]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  return [state, bloc];
}

// Lifecycle: Used for testing - provides imperative API for manual tracking control
export function createLibraryAdapter<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>
) {
  const bloc = (BlocClass as any).instance ?? new BlocClass();
  const tracker = createTrackerState<ExtractState<TBloc>>();

  return {
    bloc,

    startAccessTracking(): void {
      startTracking(tracker);
    },

    endAccessTracking(): void {
      captureTrackedPaths(tracker, bloc.state);
    },

    getStateProxy(): ExtractState<TBloc> {
      return createProxy(tracker, bloc.state);
    },

    subscribe(callback: () => void): () => void {
      return bloc.subscribe(() => {
        if (hasChanges(tracker, bloc.state)) {
          callback();
        }
      });
    },

    getTracker(): TrackerState<ExtractState<TBloc>> {
      return tracker;
    },
  };
}

export type { TrackerState, PathInfo };
export {
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
  getValueAtPath,
};
