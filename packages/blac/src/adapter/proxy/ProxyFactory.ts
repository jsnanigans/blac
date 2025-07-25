import { ConsumerTracker } from '../tracking/ConsumerTracker';

// Cache for proxies to ensure consistent object identity
const proxyCache = new WeakMap<object, WeakMap<object, any>>();

export class ProxyFactory {
  static createStateProxy<T extends object>(
    target: T,
    consumerRef: object,
    consumerTracker: ConsumerTracker,
    path: string = '',
  ): T {
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
      return existingProxy;
    }

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
          if (typeof value === 'function') {
            return value.bind(obj);
          }
          return value;
        }

        const fullPath = path ? `${path}.${prop}` : prop;

        // Track the access
        consumerTracker.trackAccess(consumerRef, 'state', fullPath);

        const value = Reflect.get(obj, prop);

        // Recursively proxy nested objects and arrays
        if (value && typeof value === 'object' && value !== null) {
          // Support arrays, plain objects, and other object types
          const isPlainObject =
            Object.getPrototypeOf(value) === Object.prototype;
          const isArray = Array.isArray(value);

          if (isPlainObject || isArray) {
            return ProxyFactory.createStateProxy(
              value,
              consumerRef,
              consumerTracker,
              fullPath,
            );
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
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[Blac] Direct state mutation detected. Use emit() or patch() instead.',
          );
        }
        return false;
      },

      deleteProperty(): boolean {
        // State properties should not be deleted directly.
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[Blac] State property deletion detected. This is not allowed.',
          );
        }
        return false;
      },
    };

    const proxy = new Proxy(target, handler);
    refCache.set(consumerRef, proxy);

    return proxy;
  }

  static createClassProxy<T extends object>(
    target: T,
    consumerRef: object,
    consumerTracker: ConsumerTracker,
  ): T {
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
      return existingProxy;
    }

    const handler: ProxyHandler<T> = {
      get(obj: T, prop: string | symbol): any {
        // Handle symbols and special properties
        if (typeof prop === 'symbol' || prop === 'constructor') {
          return Reflect.get(obj, prop);
        }

        // Don't track internal properties
        if (typeof prop === 'string' && prop.startsWith('_')) {
          return Reflect.get(obj, prop);
        }

        const value = Reflect.get(obj, prop);

        // Track all non-function property accesses
        if (typeof value !== 'function' && typeof prop === 'string') {
          consumerTracker.trackAccess(consumerRef, 'class', prop);
        }

        // For functions, track the access but ensure proper binding
        if (typeof value === 'function') {
          // Track method access (for lifecycle tracking)
          if (typeof prop === 'string') {
            consumerTracker.trackAccess(consumerRef, 'class', `${prop}()`);
          }
          return value.bind(obj);
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
    };

    const proxy = new Proxy(target, handler);
    refCache.set(consumerRef, proxy);

    return proxy;
  }
}
