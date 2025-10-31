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
} from '@blac/core';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';

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

const ARRAY_METHODS = new Set([
  'map',
  'filter',
  'forEach',
  'find',
  'some',
  'every',
  'reduce',
]);

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
  depth: number = 0,
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
  depth: number = 0,
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
        const proxiedValue = createProxyInternal(
          state,
          value as T,
          fullPath,
          depth + 1,
        );
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
function createProxyForTarget<T>(state: ProxyTrackerState<T>, target: T): T {
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
function createProxy<T extends AnyObject>(
  tracker: TrackerState<T>,
  state: T,
): T {
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
  state: T,
): void {
  tracker.previousRenderPaths = tracker.currentRenderPaths;
  tracker.currentRenderPaths = stopProxyTracking(tracker.proxyTrackerState);

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
 * StateContainer constructor with required static methods
 */
type StateContainerConstructor<TBloc extends StateContainer<any, any>> =
  BlocConstructor<TBloc> & {
    getOrCreate(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

// Utility function for shallow equality comparison
function shallowEqual(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (!Object.is(arr1[i], arr2[i])) return false;
  }
  return true;
}

// ============================================================================
// Hook Support Functions - Extracted for Performance
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

function determineTrackingMode<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(options?: UseBlocOptions<TBloc>): TrackingMode {
  return {
    useManualDeps: options?.dependencies !== undefined,
    autoTrackEnabled: options?.autoTrack !== false,
  };
}

/**
 * Checks if tracker has any tracked data
 */
function hasTrackedData<T extends AnyObject>(
  tracker: TrackerState<T>,
): boolean {
  return (
    tracker.proxyTrackerState.trackedPaths.size > 0 ||
    tracker.pathCache.size > 0 ||
    tracker.previousRenderPaths.size > 0
  );
}

/**
 * Internal state for subscription and snapshot functions
 */
interface HookState<TBloc extends StateContainer<AnyObject, AnyObject>> {
  tracker: TrackerState<ExtractState<TBloc>> | null;
  manualDepsCache: unknown[] | null;
}

/**
 * Factory: Creates subscribe function for automatic proxy tracking mode
 */
function createAutoTrackSubscribe<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(
  instance: TBloc,
  hookState: HookState<TBloc>,
): (callback: () => void) => () => void {
  return (callback: () => void) => {
    return instance.subscribe(() => {
      const tracker =
        hookState.tracker ||
        (hookState.tracker = createTrackerState<ExtractState<TBloc>>());
      if (hasChanges(tracker, instance.state)) {
        callback();
      }
    });
  };
}

/**
 * Factory: Creates subscribe function for manual dependencies mode
 */
function createManualDepsSubscribe<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(
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
function createNoTrackSubscribe<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(instance: TBloc): (callback: () => void) => () => void {
  return (callback: () => void) => instance.subscribe(callback);
}

/**
 * Factory: Creates getSnapshot function for automatic proxy tracking mode
 */
function createAutoTrackSnapshot<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(instance: TBloc, hookState: HookState<TBloc>): () => ExtractState<TBloc> {
  return () => {
    const tracker =
      hookState.tracker ||
      (hookState.tracker = createTrackerState<ExtractState<TBloc>>());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);
    }

    startTracking(tracker);
    return createProxy(tracker, instance.state);
  };
}

/**
 * Factory: Creates getSnapshot function for manual dependencies mode
 */
function createManualDepsSnapshot<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(
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
function createNoTrackSnapshot<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(instance: TBloc): () => ExtractState<TBloc> {
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
export function useBloc<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef>({});

  const [bloc, subscribe, getSnapshot, instanceKey] = useMemo(() => {
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
    };

    // Create subscribe and getSnapshot functions based on tracking mode
    let subscribeFn: (callback: () => void) => () => void;
    let getSnapshotFn: () => ExtractState<TBloc>;

    if (useManualDeps) {
      subscribeFn = createManualDepsSubscribe(instance, hookState, options!);
      getSnapshotFn = createManualDepsSnapshot(instance, hookState, options!);
    } else if (!autoTrackEnabled) {
      subscribeFn = createNoTrackSubscribe(instance);
      getSnapshotFn = createNoTrackSnapshot(instance);
    } else {
      subscribeFn = createAutoTrackSubscribe(instance, hookState);
      getSnapshotFn = createAutoTrackSnapshot(instance, hookState);
    }

    return [instance, subscribeFn, getSnapshotFn, instanceId] as const;
  }, [BlocClass]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

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
    };
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>;
}

// Re-export types
export type { UseBlocOptions, UseBlocReturn } from './types';
