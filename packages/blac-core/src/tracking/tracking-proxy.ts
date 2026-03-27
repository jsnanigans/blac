/**
 * Consolidated Tracking System
 *
 * This module provides all dependency and getter tracking functionality:
 * - Proxy creation for automatic property access tracking
 * - Dependency path tracking and change detection
 * - Getter execution tracking for computed properties
 * - Combined tracking proxy for watch/waitUntil use cases
 */
import { BLAC_DEFAULTS, BLAC_ERROR_PREFIX } from '../constants';
import type { StateContainerInstance } from '../types/utilities';
import { parsePath, getValueAtPath } from './path-utils';

// =============================================================================
// PROXY TRACKER (Low-level proxy creation)
// =============================================================================

/**
 * Check if a value can be proxied
 * Returns true for plain objects and arrays only.
 * @internal
 */
export function isProxyable(value: unknown): value is object {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === Array.prototype;
}

/**
 * State container for proxy tracking
 * @internal
 */
export interface ProxyState<T> {
  trackedPaths: Set<string>;
  isTracking: boolean;
  proxyCache: WeakMap<object, any>;
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
  boundFunctionsCache: WeakMap<Function, Function> | null;
  lastProxiedState: T | null;
  lastProxy: T | null;
  maxDepth: number;
}

/**
 * Create a new proxy tracker state
 * @internal
 */
export function createProxyState<T>(): ProxyState<T> {
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

/**
 * Start tracking property accesses
 * @internal
 */
export function startProxy<T>(state: ProxyState<T>): void {
  state.isTracking = true;
  state.trackedPaths.clear();
}

/**
 * Stop tracking and return the tracked paths
 * @internal
 */
export function stopProxy<T>(state: ProxyState<T>): Set<string> {
  state.isTracking = false;
  return new Set(state.trackedPaths);
}

/**
 * Create a proxy for an array with property access tracking
 * @internal
 */
export function createArrayProxy<T, U>(
  state: ProxyState<T>,
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
        if (!state.boundFunctionsCache) {
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
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

      if (prop === 'length') {
        if (state.isTracking) {
          const fullPath = path ? `${path}.length` : 'length';
          state.trackedPaths.add(fullPath);
        }
        return value;
      }

      let fullPath: string;
      if (typeof prop === 'string') {
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
        return createInternal(state, value as T, fullPath, depth + 1);
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

/**
 * Create a proxy for an object with property access tracking
 * @internal
 */
export function createInternal<T>(
  state: ProxyState<T>,
  target: T,
  path: string = '',
  depth: number = 0,
): T {
  if (!state.isTracking || !isProxyable(target)) {
    return target;
  }

  if (depth >= state.maxDepth) {
    console.warn(
      `${BLAC_ERROR_PREFIX} Proxy depth limit (${state.maxDepth}) reached at path "${path}". ` +
        `Deeper property accesses won't be tracked for re-renders.`,
    );
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
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
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

      if (typeof prop === 'string' && state.isTracking) {
        if (!prop.startsWith('_') && !prop.startsWith('$$')) {
          state.trackedPaths.add(fullPath);
        }
      }

      if (isProxyable(value)) {
        const proxiedValue = createInternal(
          state,
          value as T,
          fullPath,
          depth + 1,
        );
        return proxiedValue;
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

/**
 * Create a proxy for a target with caching
 * @internal
 */
export function createForTarget<T>(state: ProxyState<T>, target: T): T {
  if (state.lastProxiedState === target && state.lastProxy) {
    return state.lastProxy;
  }

  state.proxyCache = new WeakMap<object, any>();
  state.boundFunctionsCache = null;

  const proxy = createInternal(state, target, '', 0);
  state.lastProxiedState = target;
  state.lastProxy = proxy;
  return proxy;
}

// =============================================================================
// DEPENDENCY TRACKER (Path tracking and change detection)
// =============================================================================

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

function getArrayParentPath(path: string): string | null {
  if (path.endsWith('.length')) {
    return path.slice(0, -7);
  }
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

  const sortedPaths = Array.from(paths).sort((a, b) => b.length - a.length);
  const optimized = new Set<string>();

  for (const path of sortedPaths) {
    let hasMoreSpecificChild = false;

    for (const optimizedPath of optimized) {
      if (isChildPath(optimizedPath, path)) {
        hasMoreSpecificChild = true;
        break;
      }
    }

    if (!hasMoreSpecificChild) {
      optimized.add(path);
    }
  }

  const arrayParents = new Set<string>();
  for (const path of optimized) {
    const arrayParent = getArrayParentPath(path);
    if (arrayParent) {
      arrayParents.add(arrayParent);
    }
  }

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
export function createDependencyProxy<T>(
  tracker: DependencyState<T>,
  state: T,
): T {
  return createForTarget(tracker.proxyState, state);
}

/**
 * @internal
 */
export function capturePaths<T>(tracker: DependencyState<T>, state: T): void {
  tracker.previousRenderPaths = tracker.currentRenderPaths;

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
      const info = tracker.pathCache.get(path);
      if (!info) continue;
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
export function hasDependencyChanges<T>(
  tracker: DependencyState<T>,
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
 * @internal
 */
export function hasTrackedData<T>(tracker: DependencyState<T>): boolean {
  return (
    tracker.proxyState.trackedPaths.size > 0 ||
    tracker.pathCache.size > 0 ||
    tracker.previousRenderPaths.size > 0
  );
}

// =============================================================================
// GETTER TRACKER (Getter execution tracking)
// =============================================================================

/**
 * @internal
 */
export interface GetterState {
  trackedValues: Map<string | symbol, unknown>;
  currentlyAccessing: Set<string | symbol>;
  trackedGetters: Set<string | symbol>;
  isTracking: boolean;
  renderCache: Map<string | symbol, unknown>;
  cacheValid: boolean;
  depth: number;
  visitedBlocs: Set<StateContainerInstance>;
}

const descriptorCache = new WeakMap<
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
  Function,
  Map<string | symbol, PropertyDescriptor | undefined>
>();

const blocProxyCache = new WeakMap<
  StateContainerInstance,
  StateContainerInstance
>();

const activeTrackerMap = new WeakMap<StateContainerInstance, GetterState>();

const MAX_GETTER_DEPTH = BLAC_DEFAULTS.MAX_GETTER_DEPTH;

/**
 * @internal
 */
export function getDescriptor(
  obj: any,
  prop: string | symbol,
): PropertyDescriptor | undefined {
  const constructor = obj.constructor;

  let constructorCache = descriptorCache.get(constructor);
  if (constructorCache?.has(prop)) {
    return constructorCache.get(prop);
  }

  let current = obj;
  let descriptor: PropertyDescriptor | undefined;

  while (current && current !== Object.prototype) {
    descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) {
      break;
    }
    current = Object.getPrototypeOf(current);
  }

  if (!constructorCache) {
    constructorCache = new Map();
    descriptorCache.set(constructor, constructorCache);
  }
  constructorCache.set(prop, descriptor);

  return descriptor;
}

/**
 * @internal
 */
export function isGetter(obj: any, prop: string | symbol): boolean {
  const descriptor = getDescriptor(obj, prop);
  return descriptor?.get !== undefined;
}

/**
 * @internal
 */
export function createGetterState(): GetterState {
  return {
    trackedValues: new Map(),
    currentlyAccessing: new Set(),
    trackedGetters: new Set(),
    isTracking: false,
    renderCache: new Map(),
    cacheValid: false,
    depth: 0,
    visitedBlocs: new Set(),
  };
}

/**
 * @internal
 */
export function setActiveTracker<TBloc extends StateContainerInstance>(
  bloc: TBloc,
  tracker: GetterState,
): void {
  activeTrackerMap.set(bloc, tracker);
}

/**
 * @internal
 */
export function clearActiveTracker<TBloc extends StateContainerInstance>(
  bloc: TBloc,
): void {
  activeTrackerMap.delete(bloc);
}

/**
 * @internal
 */
export function getActiveTracker<TBloc extends StateContainerInstance>(
  bloc: TBloc,
): GetterState | undefined {
  return activeTrackerMap.get(bloc);
}

/**
 * @internal
 */
export function commitTrackedGetters(tracker: GetterState): void {
  if (tracker.currentlyAccessing.size > 0) {
    tracker.trackedGetters = new Set(tracker.currentlyAccessing);
  }
  tracker.currentlyAccessing.clear();
}

/**
 * Execute a tracked getter with depth/circular dependency checks and context management.
 * @internal
 */
function executeTrackedGetter<T extends StateContainerInstance>(
  target: T,
  prop: string | symbol,
  tracker: GetterState,
): unknown {
  tracker.currentlyAccessing.add(prop);

  if (tracker.cacheValid && tracker.renderCache.has(prop)) {
    const cachedValue = tracker.renderCache.get(prop);
    tracker.trackedValues.set(prop, cachedValue);
    return cachedValue;
  }

  if (tracker.depth >= MAX_GETTER_DEPTH) {
    throw new Error(
      `${BLAC_ERROR_PREFIX} Maximum getter depth (${MAX_GETTER_DEPTH}) exceeded. ` +
        `Possible circular dependency in getter "${String(prop)}" on ${target.constructor.name}.`,
    );
  }

  if (tracker.visitedBlocs.has(target)) {
    throw new Error(
      `${BLAC_ERROR_PREFIX} Circular dependency detected: getter "${String(prop)}" on ${target.constructor.name}.`,
    );
  }

  const prevDepth = tracker.depth;
  const prevVisited = new Set(tracker.visitedBlocs);

  tracker.depth++;
  tracker.visitedBlocs.add(target);

  try {
    const descriptor = getDescriptor(target, prop);
    if (!descriptor?.get) {
      return (target as Record<PropertyKey, unknown>)[prop];
    }
    const value = descriptor.get.call(target);
    tracker.trackedValues.set(prop, value);
    return value;
  } catch (error) {
    tracker.currentlyAccessing.delete(prop);
    throw error;
  } finally {
    tracker.depth = prevDepth;
    tracker.visitedBlocs = prevVisited;
  }
}

/**
 * @internal
 */
export function createBlocProxy<TBloc extends StateContainerInstance>(
  bloc: TBloc,
): TBloc {
  const cached = blocProxyCache.get(bloc);
  if (cached) {
    return cached as TBloc;
  }

  const proxy = new Proxy(bloc, {
    get(target, prop, receiver) {
      const tracker = activeTrackerMap.get(target);

      if (tracker?.isTracking && isGetter(target, prop)) {
        return executeTrackedGetter(target, prop, tracker);
      }

      return Reflect.get(target, prop, receiver);
    },
  });

  blocProxyCache.set(bloc, proxy);
  return proxy as TBloc;
}

/**
 * @internal
 */
export function hasGetterChanges<TBloc extends StateContainerInstance>(
  bloc: TBloc,
  tracker: GetterState | null,
): boolean {
  if (!tracker || tracker.trackedGetters.size === 0) {
    return false;
  }

  tracker.renderCache.clear();

  let hasAnyChange = false;

  for (const prop of tracker.trackedGetters) {
    try {
      const descriptor = getDescriptor(bloc, prop);
      if (!descriptor?.get) {
        continue;
      }

      const newValue = descriptor.get.call(bloc);
      const oldValue = tracker.trackedValues.get(prop);

      tracker.renderCache.set(prop, newValue);
      tracker.trackedValues.set(prop, newValue);

      if (!Object.is(newValue, oldValue)) {
        hasAnyChange = true;
      }
    } catch (error) {
      console.warn(
        `${BLAC_ERROR_PREFIX} Getter "${String(prop)}" threw error during change detection. Stopping tracking for this getter.`,
        error,
      );

      tracker.trackedGetters.delete(prop);
      tracker.trackedValues.delete(prop);
      tracker.cacheValid = false;
      return true;
    }
  }

  tracker.cacheValid = true;

  return hasAnyChange;
}

/**
 * @internal
 */
export function invalidateRenderCache(tracker: GetterState): void {
  tracker.cacheValid = false;
}

/**
 * @internal
 */
export function resetGetterState(tracker: GetterState): void {
  tracker.trackedValues.clear();
  tracker.currentlyAccessing.clear();
  tracker.trackedGetters.clear();
  tracker.renderCache.clear();
  tracker.cacheValid = false;
  tracker.isTracking = false;
  tracker.depth = 0;
  tracker.visitedBlocs.clear();
}

// =============================================================================
// TRACKING PROXY (Combined tracking for watch/waitUntil)
// =============================================================================

/**
 * State for tracking both state property access and getter access.
 */
export interface TrackingProxyState {
  dependencyState: DependencyState<any>;
  getterState: GetterState;
  dependencies: Set<StateContainerInstance>;
  isTracking: boolean;
}

/**
 * Create a new tracking proxy state.
 */
export function createState(): TrackingProxyState {
  return {
    dependencyState: createDependencyState(),
    getterState: createGetterState(),
    dependencies: new Set(),
    isTracking: false,
  };
}

/**
 * Start tracking on a tracking proxy.
 */
export function startTracking(tracker: TrackingProxyState): void {
  tracker.isTracking = true;
  tracker.dependencies.clear();
  tracker.getterState.isTracking = true;
  startDependency(tracker.dependencyState);
}

/**
 * Stop tracking and collect all dependencies.
 */
export function stopTracking(
  tracker: TrackingProxyState,
  bloc: StateContainerInstance,
): Set<StateContainerInstance> {
  tracker.isTracking = false;
  tracker.getterState.isTracking = false;

  capturePaths(tracker.dependencyState, bloc.state);
  commitTrackedGetters(tracker.getterState);

  return new Set(tracker.dependencies);
}

/**
 * Check if tracked state or getters have changed.
 */
export function hasChanges(
  tracker: TrackingProxyState,
  bloc: StateContainerInstance,
): boolean {
  invalidateRenderCache(tracker.getterState);

  const stateChanged = hasDependencyChanges(
    tracker.dependencyState,
    bloc.state,
  );
  const getterChanged = hasGetterChanges(bloc, tracker.getterState);

  return stateChanged || getterChanged;
}

/**
 * Create a tracking proxy for a bloc instance.
 * Tracks both state property access and getter access.
 */
export function createTrackingProxy<T extends StateContainerInstance>(
  bloc: T,
  tracker: TrackingProxyState,
): T {
  tracker.dependencies.add(bloc);

  const stateProxyCache = new WeakMap<object, any>();

  const proxy = new Proxy(bloc, {
    get(target, prop, receiver) {
      if (prop === 'state') {
        if (!tracker.isTracking) {
          return target.state;
        }

        const rawState = target.state;
        if (rawState === null || typeof rawState !== 'object') {
          return rawState;
        }

        if (stateProxyCache.has(rawState)) {
          return stateProxyCache.get(rawState);
        }

        const stateProxy = createDependencyProxy(
          tracker.dependencyState,
          rawState,
        );
        stateProxyCache.set(rawState, stateProxy);
        return stateProxy;
      }

      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }

      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'function') {
        return value.bind(target);
      }

      if (tracker.isTracking && isGetter(target, prop)) {
        return executeTrackedGetter(target, prop, tracker.getterState);
      }

      return value;
    },
  });

  return proxy as T;
}
