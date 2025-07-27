import type { BlacAdapter } from './BlacAdapter';

// Cache for proxies to ensure consistent object identity
const proxyCache = new WeakMap<object, WeakMap<object, any>>();

export class ProxyFactory {
  static createStateProxy<T extends object>(options: {
    target: T;
    consumerRef: object;
    consumerTracker: BlacAdapter;
    path?: string;
  }): T {
    const { target, consumerRef, consumerTracker, path = '' } = options;
    console.log(
      `🏭 [ProxyFactory] createStateProxy called - Path: ${path || 'root'}`,
    );

    if (!consumerRef || !consumerTracker) {
      console.log(
        `🏭 [ProxyFactory] Missing consumerRef or tracker - returning raw target`,
      );
      return target;
    }

    if (typeof target !== 'object' || target === null) {
      console.log(`🏭 [ProxyFactory] Target is not object - returning as is`);
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
      console.log(
        `🏭 [ProxyFactory] Returning cached proxy for path: ${path || 'root'}`,
      );
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
        console.log(`🏭 [ProxyFactory] State property accessed: ${fullPath}`);

        // Track the access
        consumerTracker.trackAccess(consumerRef, 'state', fullPath);

        const value = Reflect.get(obj, prop);
        console.log(`🏭 [ProxyFactory] Value type: ${typeof value}`);

        // Recursively proxy nested objects and arrays
        if (value && typeof value === 'object' && value !== null) {
          // Support arrays, plain objects, and other object types
          const isPlainObject =
            Object.getPrototypeOf(value) === Object.prototype;
          const isArray = Array.isArray(value);

          if (isPlainObject || isArray) {
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
    console.log(
      `🏭 [ProxyFactory] Created new state proxy for path: ${path || 'root'}`,
    );

    return proxy;
  }

  static createClassProxy<T extends object>(options: {
    target: T;
    consumerRef: object;
    consumerTracker: BlacAdapter;
  }): T {
    const { target, consumerRef, consumerTracker } = options;
    console.log(`🏭 [ProxyFactory] createClassProxy called`);

    if (!consumerRef || !consumerTracker) {
      console.log(
        `🏭 [ProxyFactory] Missing consumerRef or tracker - returning raw target`,
      );
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
      console.log(`🏭 [ProxyFactory] Returning cached class proxy`);
      return existingProxy;
    }

    const handler: ProxyHandler<T> = {
      get(obj: T, prop: string | symbol): any {
        const value = Reflect.get(obj, prop);
        const isGetter = Reflect.getOwnPropertyDescriptor(obj, prop)?.get;

        if (!isGetter) {
          // bind methods to the object if they are functions
          if (typeof value === 'function') {
            console.log(
              `🏭 [ProxyFactory] Method accessed: ${String(prop)}, binding to object`,
            );
            return value.bind(obj);
          }
          // Return the value directly if it's not a getter
          return value;
        }

        // For getters, track access without binding
        consumerTracker.trackAccess(consumerRef, 'class', prop);
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
    console.log(`🏭 [ProxyFactory] Created new class proxy`);

    return proxy;
  }
}
