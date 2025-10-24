/**
 * ProxyTracker - Automatic dependency tracking through Proxies
 *
 * Tracks property access on state objects to automatically determine
 * which parts of the state a component depends on.
 */

import { BlacLogger } from '../logging/Logger';

/**
 * Check if a value is an object that can be proxied
 */
function isProxyable(value: unknown): value is object {
  return (
    value !== null &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !(value instanceof RegExp) &&
    !(value instanceof Map) &&
    !(value instanceof Set) &&
    !(value instanceof WeakMap) &&
    !(value instanceof WeakSet) &&
    !(value instanceof Promise)
  );
}

/**
 * Tracks property access on state objects
 */
export class ProxyTracker<T> {
  private trackedPaths = new Set<string>();
  private isTracking = false;
  private proxyCache = new WeakMap<object, any>();
  private maxDepth = 10; // Prevent infinite recursion

  /**
   * Create a proxy that tracks property access
   */
  createProxy(target: T, path: string = '', depth: number = 0): T {
    // Return target as-is if not tracking or not proxyable
    if (!this.isTracking || !isProxyable(target)) {
      return target;
    }

    // Prevent infinite recursion or max depth exceeded
    if (depth >= this.maxDepth) {
      return target;
    }

    // Check cache to avoid creating duplicate proxies
    if (this.proxyCache.has(target)) {
      return this.proxyCache.get(target);
    }

    // Handle arrays specially to track index access
    if (Array.isArray(target)) {
      return this.createArrayProxy(
        target as unknown as any[],
        path,
        depth,
      ) as unknown as T;
    }

    // Create object proxy for all objects
    const proxy = new Proxy(target, {
      get: (obj, prop: string | symbol) => {
        const value = Reflect.get(obj, prop);

        // Handle functions - bind them to original object
        if (typeof value === 'function') {
          return value.bind(obj);
        }

        // Build the full path
        const fullPath = path ? `${path}.${String(prop)}` : String(prop);

        // If the value is a nested object, recursively proxy it
        // DON'T track intermediate objects, only track when we access leaf values
        if (isProxyable(value)) {
          const proxiedValue = this.createProxy(value, fullPath, depth + 1);
          return proxiedValue;
        }

        // Track ONLY leaf properties (non-objects)
        if (typeof prop === 'string' && this.isTracking) {
          // Don't track internal properties
          if (!prop.startsWith('_') && !prop.startsWith('$$')) {
            this.trackedPaths.add(fullPath);
            BlacLogger.debug('ProxyTracker', 'Tracked property access', {
              path: fullPath,
              valueType: typeof value,
            });
          }
        }

        return value;
      },

      // Track 'in' operator
      has: (obj, prop: string | symbol) => {
        if (typeof prop === 'string' && this.isTracking) {
          const fullPath = path ? `${path}.${prop}` : prop;
          this.trackedPaths.add(fullPath);
          BlacLogger.debug('ProxyTracker', 'Tracked "in" operator access', {
            path: fullPath,
          });
        }
        return Reflect.has(obj, prop);
      },

      // Track Object.keys, Object.entries, etc.
      ownKeys: (obj) => {
        if (this.isTracking && path) {
          // Track that we're iterating over this object
          this.trackedPaths.add(path);
          BlacLogger.debug('ProxyTracker', 'Tracked object keys iteration', {
            path: path,
          });
        }
        return Reflect.ownKeys(obj);
      },
    });

    this.proxyCache.set(target, proxy);
    return proxy as T;
  }

  /**
   * Create a proxy for arrays with special handling
   */
  private createArrayProxy<U>(
    target: U[],
    path: string,
    depth: number = 0,
  ): U[] {
    const proxy = new Proxy(target, {
      get: (arr, prop: string | symbol) => {
        const value = Reflect.get(arr, prop);

        // Handle array methods
        if (typeof value === 'function') {
          // For methods like map, filter, etc., track array access
          if (
            [
              'map',
              'filter',
              'forEach',
              'find',
              'some',
              'every',
              'reduce',
            ].includes(String(prop))
          ) {
            if (this.isTracking && path) {
              this.trackedPaths.add(path);
              BlacLogger.debug('ProxyTracker', 'Tracked array method access', {
                path: path,
                method: String(prop),
              });
            }
          }
          return value.bind(arr);
        }

        // Build the full path for array access
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

        // Recursively proxy nested objects in arrays
        // DON'T track intermediate objects, only track when we access leaf values
        if (isProxyable(value)) {
          return this.createProxy(value, fullPath, depth + 1);
        }

        // Track ONLY leaf properties (non-objects) and array length
        if (this.isTracking) {
          this.trackedPaths.add(fullPath);
          BlacLogger.debug('ProxyTracker', 'Tracked array property access', {
            path: fullPath,
            valueType: typeof value,
          });
        }

        return value;
      },
    });

    this.proxyCache.set(target, proxy);
    return proxy;
  }

  /**
   * Start tracking property access
   */
  startTracking(): void {
    this.isTracking = true;
    this.trackedPaths.clear();
    BlacLogger.debug('ProxyTracker', 'Started tracking');
  }

  /**
   * Stop tracking and return tracked paths
   */
  stopTracking(): Set<string> {
    this.isTracking = false;
    BlacLogger.debug('ProxyTracker', 'Stopped tracking', {
      pathCount: this.trackedPaths.size,
      paths: Array.from(this.trackedPaths),
    });
    return new Set(this.trackedPaths);
  }

  /**
   * Get currently tracked paths
   */
  getTrackedPaths(): ReadonlySet<string> {
    return new Set(this.trackedPaths);
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Clear proxy cache (useful for memory management)
   */
  clearCache(): void {
    this.proxyCache = new WeakMap();
  }

  /**
   * Set maximum tracking depth
   */
  setMaxDepth(depth: number): void {
    this.maxDepth = Math.max(1, depth);
  }

  /**
   * Add a path manually (useful for forcing dependencies)
   */
  addPath(path: string): void {
    this.trackedPaths.add(path);
  }

  /**
   * Remove a path manually
   */
  removePath(path: string): void {
    this.trackedPaths.delete(path);
  }

  /**
   * Clear all tracked paths
   */
  clearPaths(): void {
    this.trackedPaths.clear();
  }
}

/**
 * Global proxy tracker instance for convenience
 */
export const globalProxyTracker = new ProxyTracker();

/**
 * Utility function to track property access in a callback
 */
export function trackAccess<T, R>(
  state: T,
  callback: (proxiedState: T) => R,
): { result: R; trackedPaths: Set<string> } {
  const tracker = new ProxyTracker<T>();

  tracker.startTracking();
  const proxiedState = tracker.createProxy(state);
  const result = callback(proxiedState);
  const trackedPaths = tracker.stopTracking();

  return { result, trackedPaths };
}
