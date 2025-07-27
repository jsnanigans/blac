import type { BlacAdapter } from './BlacAdapter';

// Cache for proxies to ensure consistent object identity
const proxyCache = new WeakMap<object, WeakMap<object, any>>();

// Statistics tracking
let proxyStats = {
  stateProxiesCreated: 0,
  classProxiesCreated: 0,
  cacheHits: 0,
  cacheMisses: 0,
  propertyAccesses: 0,
  nestedProxiesCreated: 0,
};

export class ProxyFactory {
  static createStateProxy<T extends object>(options: {
    target: T;
    consumerRef: object;
    consumerTracker: BlacAdapter;
    path?: string;
  }): T {
    const { target, consumerRef, consumerTracker, path = '' } = options;

    if (!consumerRef || !consumerTracker) {
      return target;
    }

    if (typeof target !== 'object' || target === null) {
      return target;
    }

    // Check cache to ensure consistent proxy identity
    let refCache = proxyCache.get(target);
    if (!refCache) {
      refCache = new WeakMap();
      proxyCache.set(target, refCache);
    }

    const existingProxy = refCache.get(consumerRef);
    if (existingProxy) {
      proxyStats.cacheHits++;
      return existingProxy;
    }

    proxyStats.cacheMisses++;

    const handler: ProxyHandler<T> = {
      get(obj: T, prop: string | symbol): any {
        // Handle symbols and special properties
        if (typeof prop === 'symbol' || prop === 'constructor') {
          return Reflect.get(obj, prop);
        }

        // For arrays, handle special methods that don't need tracking
        if (
          Array.isArray(obj) &&
          (prop === 'length' ||
            prop === 'forEach' ||
            prop === 'map' ||
            prop === 'filter')
        ) {
          const value = Reflect.get(obj, prop);
          /*
          if (typeof value === 'function') {
            return value.bind(obj);
          }
          */
          return value;
        }

        const fullPath = path ? `${path}.${prop}` : prop;
        proxyStats.propertyAccesses++;

        const value = Reflect.get(obj, prop);
        const valueType = typeof value;
        const isObject = value && valueType === 'object' && value !== null;

        // Track the access with value (only for primitives at root level)
        const trackValue = !isObject ? value : undefined;
        consumerTracker.trackAccess(consumerRef, 'state', fullPath, trackValue);

        // Recursively proxy nested objects and arrays
        if (value && typeof value === 'object' && value !== null) {
          // Support arrays, plain objects, and other object types
          const isPlainObject =
            Object.getPrototypeOf(value) === Object.prototype;
          const isArray = Array.isArray(value);

          if (isPlainObject || isArray) {
            proxyStats.nestedProxiesCreated++;
            return ProxyFactory.createStateProxy({
              target: value,
              consumerRef,
              consumerTracker,
              path: fullPath,
            });
          }
        }

        return value;
      },

      has(obj: T, prop: string | symbol): boolean {
        return prop in obj;
      },

      ownKeys(obj: T): (string | symbol)[] {
        return Reflect.ownKeys(obj);
      },

      getOwnPropertyDescriptor(
        obj: T,
        prop: string | symbol,
      ): PropertyDescriptor | undefined {
        return Reflect.getOwnPropertyDescriptor(obj, prop);
      },

      set(): boolean {
        // State should not be mutated directly. Use emit() or patch() methods.
        return false;
      },

      deleteProperty(): boolean {
        // State properties should not be deleted directly.
        return false;
      },
    };

    const proxy = new Proxy(target, handler);
    refCache.set(consumerRef, proxy);

    proxyStats.stateProxiesCreated++;

    return proxy;
  }

  static createClassProxy<T extends object>(options: {
    target: T;
    consumerRef: object;
    consumerTracker: BlacAdapter;
  }): T {
    const { target, consumerRef, consumerTracker } = options;

    if (!consumerRef || !consumerTracker) {
      return target;
    }

    // Check cache for class proxies
    let refCache = proxyCache.get(target);
    if (!refCache) {
      refCache = new WeakMap();
      proxyCache.set(target, refCache);
    }

    const existingProxy = refCache.get(consumerRef);
    if (existingProxy) {
      proxyStats.cacheHits++;
      return existingProxy;
    }

    proxyStats.cacheMisses++;

    const handler: ProxyHandler<T> = {
      get(obj: T, prop: string | symbol): any {
        const value = Reflect.get(obj, prop);
        // Check for getter on the prototype chain with safety limits
        let isGetter = false;
        let currentObj: any = obj;
        const visitedPrototypes = new WeakSet();
        const MAX_PROTOTYPE_DEPTH = 10; // Reasonable depth limit
        let depth = 0;

        while (currentObj && !isGetter && depth < MAX_PROTOTYPE_DEPTH) {
          // Check for circular references
          if (visitedPrototypes.has(currentObj)) {
            break;
          }
          visitedPrototypes.add(currentObj);

          try {
            const descriptor = Object.getOwnPropertyDescriptor(
              currentObj,
              prop,
            );
            if (descriptor && descriptor.get) {
              isGetter = true;
              break;
            }
            currentObj = Object.getPrototypeOf(currentObj);
            depth++;
          } catch (error) {
            break;
          }
        }

        if (!isGetter) {
          // bind methods to the object if they are functions
          /*
          if (typeof value === 'function') {
            proxyStats.propertyAccesses++;
            console.log(
              `🏭 [ProxyFactory] 🔧 Method accessed: ${String(prop)}`,
            );
            console.log(`🏭 [ProxyFactory] Binding method to object instance`);
            return value.bind(obj);
          }
          */

          // Return the value directly if it's not a getter or method
          return value;
        }

        // For getters, track access and value
        proxyStats.propertyAccesses++;

        // Track the getter value if it's a primitive
        const getterValue = value;
        const isGetterValuePrimitive =
          getterValue !== null && typeof getterValue !== 'object';
        const trackValue = isGetterValuePrimitive ? getterValue : undefined;

        // Track access with value for primitives
        consumerTracker.trackAccess(
          consumerRef,
          'class',
          String(prop),
          trackValue,
        );
        return value;
      },

      has(obj: T, prop: string | symbol): boolean {
        return prop in obj;
      },

      ownKeys(obj: T): (string | symbol)[] {
        return Reflect.ownKeys(obj);
      },

      getOwnPropertyDescriptor(
        obj: T,
        prop: string | symbol,
      ): PropertyDescriptor | undefined {
        return Reflect.getOwnPropertyDescriptor(obj, prop);
      },
    };

    const proxy = new Proxy(target, handler);
    refCache.set(consumerRef, proxy);

    proxyStats.classProxiesCreated++;

    return proxy;
  }

  static getStats() {
    return {
      ...proxyStats,
      totalProxies:
        proxyStats.stateProxiesCreated + proxyStats.classProxiesCreated,
      cacheEfficiency:
        proxyStats.cacheHits + proxyStats.cacheMisses > 0
          ? `${((proxyStats.cacheHits / (proxyStats.cacheHits + proxyStats.cacheMisses)) * 100).toFixed(1)}%`
          : 'N/A',
    };
  }

  static resetStats() {
    proxyStats = {
      stateProxiesCreated: 0,
      classProxiesCreated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      propertyAccesses: 0,
      nestedProxiesCreated: 0,
    };
  }
}
