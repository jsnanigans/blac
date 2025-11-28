/**
 * Functional proxy tracker for automatic dependency tracking
 *
 * This module provides a functional approach to proxy-based dependency tracking.
 * Unlike the class-based ProxyTracker, this uses a state object pattern that's
 * easier to integrate with functional programming patterns and framework hooks.
 *
 * @internal
 */

/**
 * Check if a value can be proxied
 *
 * Returns true for plain objects and arrays only.
 * Excludes built-in objects like Date, Map, Set, etc.
 *
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
export interface ProxyTrackerState<T> {
  /** Set of all tracked property paths */
  trackedPaths: Set<string>;
  /** Whether tracking is currently active */
  isTracking: boolean;
  /** Cache of created proxies to avoid duplicates */
  proxyCache: WeakMap<object, any>;
  /** Cache of bound functions to maintain referential equality */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  boundFunctionsCache: WeakMap<Function, Function> | null;
  /** Last state object that was proxied (for cache invalidation) */
  lastProxiedState: T | null;
  /** Last proxy created (for cache reuse) */
  lastProxy: T | null;
  /** Maximum depth for nested proxy creation */
  maxDepth: number;
}

/**
 * Create a new proxy tracker state
 *
 * @example
 * const state = createProxyTrackerState<MyState>();
 * startProxyTracking(state);
 * const proxy = createProxyForTarget(state, myObject);
 * // ... use proxy ...
 * const paths = stopProxyTracking(state);
 *
 * @internal
 */
export function createProxyTrackerState<T>(): ProxyTrackerState<T> {
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
 *
 * Clears previous tracked paths and enables tracking mode.
 *
 * @internal
 */
export function startProxyTracking<T>(state: ProxyTrackerState<T>): void {
  state.isTracking = true;
  state.trackedPaths.clear();
}

/**
 * Stop tracking and return the tracked paths
 *
 * Returns a new Set containing all tracked paths.
 *
 * @internal
 */
export function stopProxyTracking<T>(state: ProxyTrackerState<T>): Set<string> {
  state.isTracking = false;
  return new Set(state.trackedPaths);
}

/**
 * Create a proxy for an array with property access tracking
 *
 * Tracks:
 * - Array element access (arr[0])
 * - Length access (arr.length)
 * - Array method calls (arr.map, arr.filter, etc.)
 *
 * @internal
 */
export function createArrayProxy<T, U>(
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
        // Don't track array methods - the array itself is already tracked
        if (!state.boundFunctionsCache) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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

      // Track array length access
      if (prop === 'length') {
        if (state.isTracking) {
          const fullPath = path ? `${path}.length` : 'length';
          state.trackedPaths.add(fullPath);
        }
        return value;
      }

      // Track array index access
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

/**
 * Create a proxy for an object with property access tracking
 *
 * This is the core proxy creation function that recursively creates proxies
 * for nested objects and arrays.
 *
 * Tracks:
 * - Property access (obj.prop)
 * - Nested property access (obj.nested.prop)
 * - 'in' operator usage ('prop' in obj)
 * - Object.keys, Object.entries, etc.
 *
 * @internal
 */
export function createProxyInternal<T>(
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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

      // Track ALL property accesses (objects, arrays, primitives)
      // This ensures accessing state.items or state.user tracks those paths
      if (typeof prop === 'string' && state.isTracking) {
        if (!prop.startsWith('_') && !prop.startsWith('$$')) {
          state.trackedPaths.add(fullPath);
        }
      }

      // If the value is an object/array, create a nested proxy for deeper tracking
      if (isProxyable(value)) {
        const proxiedValue = createProxyInternal(
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
 *
 * If the target hasn't changed since the last call, returns the cached proxy.
 * Otherwise, creates a new proxy and caches it.
 *
 * This is the main entry point for creating tracked proxies.
 *
 * @internal
 */
export function createProxyForTarget<T>(
  state: ProxyTrackerState<T>,
  target: T,
): T {
  if (state.lastProxiedState === target && state.lastProxy) {
    return state.lastProxy;
  }

  // Clear caches when state changes to prevent stale bound functions
  // This is critical for array methods like .map() which get bound to the target
  state.proxyCache = new WeakMap<object, any>();
  state.boundFunctionsCache = null;

  const proxy = createProxyInternal(state, target, '', 0);
  state.lastProxiedState = target;
  state.lastProxy = proxy;
  return proxy;
}
