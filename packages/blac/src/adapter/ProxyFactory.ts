import { BlocBase } from '../BlocBase';

interface ConsumerTracker {
  trackAccess: (
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ) => void;
}

// Minimal cache for backward compatibility
const proxyCache = new WeakMap<object, WeakMap<object, any>>();

// Minimal stats for backward compatibility
const stats = {
  stateProxiesCreated: 0,
  classProxiesCreated: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalProxiesCreated: 0,
};

/**
 * Creates a proxy for state objects that tracks property access
 * V2: Top-level tracking only - no nested proxies
 */
export const createStateProxy = <T extends object>(
  target: T,
  consumerRef: object,
  consumerTracker: ConsumerTracker,
  path = '',
): T => {
  if (
    !consumerRef ||
    !consumerTracker ||
    typeof target !== 'object' ||
    target === null
  ) {
    return target;
  }

  // Only create proxies for root-level state (path is empty)
  // This is a breaking change from v1 which created nested proxies
  if (path !== '') {
    return target;
  }

  // Check cache for root objects only
  let refCache = proxyCache.get(target);
  if (!refCache) {
    refCache = new WeakMap();
    proxyCache.set(target, refCache);
  }

  const cached = refCache.get(consumerRef);
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

      const value = Reflect.get(obj, prop);

      // Track only the top-level property name (no nested paths)
      // Track all accesses regardless of value type
      consumerTracker.trackAccess(
        consumerRef,
        'state',
        String(prop), // Just the property name, no path concatenation
        undefined, // No value tracking for state properties
      );

      // Return raw value - no nested proxy creation
      // This means nested property access won't be tracked
      return value;
    },

    set: () => false, // State should be immutable
    deleteProperty: () => false, // State properties should not be deleted
  });

  // Cache root proxy
  const proxyRefCache = proxyCache.get(target)!;
  proxyRefCache.set(consumerRef, proxy);
  stats.stateProxiesCreated++;
  stats.totalProxiesCreated++;

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

  // Check cache
  let refCache = proxyCache.get(target);
  if (!refCache) {
    refCache = new WeakMap();
    proxyCache.set(target, refCache);
  }

  const cached = refCache.get(consumerRef);
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

  // Cache proxy
  refCache.set(consumerRef, proxy);
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
  }) =>
    createStateProxy(
      options.target,
      options.consumerRef,
      options.consumerTracker,
      options.path,
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
  }) =>
    createStateProxy(
      options.state,
      options.consumerRef,
      options.consumerTracker,
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

  // Compatibility functions that return expected structure
  getStats: () => ({
    ...stats,
    propertyAccesses: 0,
    nestedProxiesCreated: 0,
    cacheEfficiency:
      stats.cacheHits + stats.cacheMisses > 0
        ? `${((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)}%`
        : 'N/A',
    lifetime: '0ms',
    proxiesPerSecond: 'N/A',
  }),
  resetStats: () => {
    stats.stateProxiesCreated = 0;
    stats.classProxiesCreated = 0;
    stats.cacheHits = 0;
    stats.cacheMisses = 0;
    stats.totalProxiesCreated = 0;
  },
};
