import { BlocBase } from '../BlocBase';

interface ConsumerTracker {
  trackAccess: (
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ) => void;
}

// V3: Three-level cache structure for path-based proxy caching
// Level 1: target object -> Level 2: consumerRef -> Level 3: path -> proxy
const proxyCache = new WeakMap<
  object, // target object
  WeakMap<
    object, // consumerRef
    Map<string, any> // path -> proxy
  >
>();

// V3: Enhanced stats for tracking cache effectiveness and nested proxies
const stats = {
  stateProxiesCreated: 0,
  classProxiesCreated: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalProxiesCreated: 0,
  nestedProxiesCreated: 0,
};

/**
 * Creates a proxy for state objects that tracks property access
 * V3: Deep/nested dependency tracking with recursive proxy creation
 *
 * Creates nested proxies recursively when properties are accessed.
 * Uses three-level cache (target → consumer → path → proxy) for efficiency.
 * Tracks full paths: "profile.address.city" not just "profile".
 * Lazy creation: Only creates proxies for accessed paths.
 *
 * @param target - The object to proxy
 * @param consumerRef - Reference to the consuming component
 * @param consumerTracker - Tracker for recording access
 * @param path - Current path (used for nested proxies)
 * @param currentDepth - Current depth in the proxy tree (default: 0)
 * @param maxDepth - Maximum depth for proxy creation (default: 3)
 * @returns Proxied object with dependency tracking
 */
export const createStateProxy = <T extends object>(
  target: T,
  consumerRef: object,
  consumerTracker: ConsumerTracker,
  path = '',
  currentDepth = 0,
  maxDepth = 3,
): T => {
  // Validation
  if (
    !consumerRef ||
    !consumerTracker ||
    typeof target !== 'object' ||
    target === null
  ) {
    return target;
  }

  // Level 1: Get or create target cache
  let refCache = proxyCache.get(target);
  if (!refCache) {
    refCache = new WeakMap();
    proxyCache.set(target, refCache);
  }

  // Level 2: Get or create consumer cache
  let pathCache = refCache.get(consumerRef);
  if (!pathCache) {
    pathCache = new Map();
    refCache.set(consumerRef, pathCache);
  }

  // Level 3: Check path cache
  const cached = pathCache.get(path);
  if (cached) {
    stats.cacheHits++;
    return cached;
  }
  stats.cacheMisses++;

  const proxy = new Proxy(target, {
    get(obj: T, prop: string | symbol): any {
      // Handle symbols and special properties
      if (typeof prop === 'symbol' || prop === 'constructor') {
        return Reflect.get(obj, prop);
      }

      // Build full path for nested tracking
      const fullPath = path ? `${path}.${String(prop)}` : String(prop);
      const value = Reflect.get(obj, prop);

      // Track access with FULL path (not just top-level)
      consumerTracker.trackAccess(
        consumerRef,
        'state',
        fullPath,
        undefined,
      );

      // Recursively proxy nested objects and arrays
      if (value && typeof value === 'object') {
        const isPlainObject =
          Object.getPrototypeOf(value) === Object.prototype;
        const isArray = Array.isArray(value);

        if (isPlainObject || isArray) {
          // Check depth limit before creating nested proxy
          if (currentDepth >= maxDepth) {
            // Return raw value when depth limit is reached
            return value;
          }

          // Recursive call with full path and incremented depth
          return createStateProxy(
            value,
            consumerRef,
            consumerTracker,
            fullPath,
            currentDepth + 1,
            maxDepth,
          );
        }
      }

      // Return primitive value
      return value;
    },

    set: () => false, // State should be immutable
    deleteProperty: () => false, // State properties should not be deleted
  });

  // Cache the created proxy at the correct path
  pathCache.set(path, proxy);
  stats.stateProxiesCreated++;
  stats.totalProxiesCreated++;
  if (path !== '') {
    stats.nestedProxiesCreated++;
  }

  return proxy;
};

/**
 * Creates a proxy for bloc instances that tracks getter access
 */
export const createBlocProxy = <T extends object>(
  target: T,
  consumerRef: object,
  consumerTracker: ConsumerTracker,
): T => {
  if (!consumerRef || !consumerTracker) {
    return target;
  }

  // Check cache (2-level: target → consumer)
  let refCache = proxyCache.get(target);
  if (!refCache) {
    refCache = new WeakMap();
    proxyCache.set(target, refCache);
  }

  // For bloc proxies, use empty path '' as the cache key
  let pathCache = refCache.get(consumerRef) as Map<string, any> | undefined;
  if (!pathCache) {
    pathCache = new Map();
    refCache.set(consumerRef, pathCache);
  }

  const cached = pathCache.get('');
  if (cached) {
    stats.cacheHits++;
    return cached;
  }
  stats.cacheMisses++;

  const proxy = new Proxy(target, {
    get(obj: T, prop: string | symbol): any {
      const value = Reflect.get(obj, prop);

      // Only track getters, not methods or regular properties
      const descriptor = findPropertyDescriptor(obj, prop);
      if (descriptor?.get) {
        // Track getter access with value for primitives
        const isPrimitive = value !== null && typeof value !== 'object';
        consumerTracker.trackAccess(
          consumerRef,
          'class',
          String(prop),
          isPrimitive ? value : undefined,
        );
      }

      return value;
    },
  });

  // Cache proxy using empty string as path
  pathCache.set('', proxy);
  stats.classProxiesCreated++;
  stats.totalProxiesCreated++;

  return proxy;
};

/**
 * Helper to find property descriptor in prototype chain
 */
const findPropertyDescriptor = (
  obj: any,
  prop: string | symbol,
  maxDepth = 10,
): PropertyDescriptor | undefined => {
  let current = obj;
  let depth = 0;

  while (current && depth < maxDepth) {
    const descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) return descriptor;

    current = Object.getPrototypeOf(current);
    depth++;
  }

  return undefined;
};

// Export compatibility functions for easier migration
export const ProxyFactory = {
  createStateProxy: (options: {
    target: any;
    consumerRef: object;
    consumerTracker: ConsumerTracker;
    path?: string;
    currentDepth?: number;
    maxDepth?: number;
  }) =>
    createStateProxy(
      options.target,
      options.consumerRef,
      options.consumerTracker,
      options.path,
      options.currentDepth,
      options.maxDepth,
    ),

  createClassProxy: (options: {
    target: any;
    consumerRef: object;
    consumerTracker: ConsumerTracker;
  }) =>
    createBlocProxy(
      options.target,
      options.consumerRef,
      options.consumerTracker,
    ),

  getProxyState: (options: {
    state: any;
    consumerRef: object;
    consumerTracker: ConsumerTracker;
    currentDepth?: number;
    maxDepth?: number;
  }) =>
    createStateProxy(
      options.state,
      options.consumerRef,
      options.consumerTracker,
      '',
      options.currentDepth,
      options.maxDepth,
    ),

  getProxyBlocInstance: <B extends BlocBase<any>>(options: {
    blocInstance: B;
    consumerRef: object;
    consumerTracker: ConsumerTracker;
  }) =>
    createBlocProxy(
      options.blocInstance,
      options.consumerRef,
      options.consumerTracker,
    ),

  // V3: Enhanced stats with cache hit rate calculation
  getStats: () => ({
    ...stats,
    propertyAccesses: 0,
    cacheHitRate:
      stats.cacheHits + stats.cacheMisses > 0
        ? `${((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)}%`
        : 'N/A',
    // Legacy compatibility
    cacheEfficiency:
      stats.cacheHits + stats.cacheMisses > 0
        ? `${((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)}%`
        : 'N/A',
    lifetime: '0ms',
    proxiesPerSecond: 'N/A',
  }),
  resetStats: () => {
    const oldStats = { ...stats };
    stats.stateProxiesCreated = 0;
    stats.classProxiesCreated = 0;
    stats.cacheHits = 0;
    stats.cacheMisses = 0;
    stats.totalProxiesCreated = 0;
    stats.nestedProxiesCreated = 0;
    return oldStats;
  },
};
