/**
 * DependencyTracker
 *
 * Tracks property access on state objects during React render to enable
 * automatic fine-grained reactivity without explicit selectors.
 *
 * Key Features:
 * - Proxy-based property access tracking
 * - Configurable depth limiting (default 2 levels)
 * - Path-based dependency representation
 * - Read-only proxies (prevents mutations during render)
 * - Debug logging support
 *
 * @module adapter/DependencyTracker
 */

/**
 * DependencyTracker class for automatic property access tracking
 */
export class DependencyTracker {
  /** Whether tracking is currently active */
  private tracking = false;

  /** Set of tracked dependency paths (e.g., "user.profile.name") */
  private dependencies = new Set<string>();

  /** Cache of created proxies to avoid recreating them */
  private proxyCache = new WeakMap<object, any>();

  /** Maximum depth to track (default: 2) */
  private maxDepth: number;

  /** Debug mode flag */
  private debugMode = false;

  /** Tracking start time for performance measurement */
  private trackingStartTime = 0;

  /** Set of paths where depth limit was reached (for warnings) */
  private depthWarnings = new Set<string>();

  /** Last state used for comparison */
  private lastState: any = null;

  /**
   * Create a new DependencyTracker
   * @param maxDepth - Maximum depth to track nested properties (default: 2)
   */
  constructor(maxDepth = 2) {
    this.maxDepth = maxDepth;
  }

  /**
   * Enable or disable debug logging
   * @param enabled - Whether to enable debug mode
   */
  enableDebug(enabled = true): void {
    this.debugMode = enabled;
  }

  /**
   * Start tracking property access
   * Clears previous dependencies and begins fresh tracking
   */
  startTracking(): void {
    if (this.debugMode) {
      this.trackingStartTime = performance.now();
      console.trace('[DependencyTracker] Starting dependency tracking');
    }

    this.tracking = true;
    this.getterIdLastAccessedPath.clear();
    this.dependencies.clear();
  }

  /**
   * Stop tracking and return the collected dependencies
   * @returns Set of tracked dependency paths
   */
  stopTracking(): Set<string> {
    this.tracking = false;
    const deps = new Set(this.dependencies);

    if (this.debugMode) {
      const duration = performance.now() - this.trackingStartTime;
      console.log(
        '[DependencyTracker] Tracked dependencies:',
        Array.from(deps),
      );
      console.log(`[DependencyTracker] Tracking took ${duration.toFixed(2)}ms`);

      this.warnOnLargeDependencySet(deps);
    }

    this.getterIdLastAccessedPath.clear();
    this.dependencies.clear();
    return deps;
  }

  /**
   * Check if tracking is currently active
   * @returns True if tracking is active
   */
  isTracking(): boolean {
    return this.tracking;
  }

  getterIdLastAccessedPath: Map<string, string> = new Map();

  addDependency(path: string, getterId: string): void {
    const currentPath = this.getterIdLastAccessedPath.get(getterId);
    if (currentPath && path.includes(currentPath)) {
      this.dependencies.delete(currentPath);
    }

    this.getterIdLastAccessedPath.set(getterId, path);
    this.dependencies.add(path);
  }

  /**
   * Create a tracked proxy for the given object
   * @param obj - Object to wrap in tracking proxy
   * @param path - Current path in the object tree
   * @returns Proxied object that tracks property access
   */
  createTrackedProxy<T>(obj: T, path: string[], getterId: string): T {
    // Return primitives as-is
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Check cache first to avoid creating duplicate proxies
    if (this.proxyCache.has(obj)) {
      return this.proxyCache.get(obj);
    }

    // Skip arrays, Sets, and Maps in v1 (not supported yet)
    if (Array.isArray(obj) || obj instanceof Set || obj instanceof Map) {
      if (this.debugMode && this.tracking) {
        console.warn(
          `[DependencyTracker] Arrays/Sets/Maps are not tracked in v1. Path: ${path.join('.')}`,
        );
      }
      return obj;
    }

    // Check depth limit
    if (path.length >= this.maxDepth) {
      // Track at current level, don't go deeper
      if (this.tracking) {
        const pathStr = path.join('.');
        this.addDependency(pathStr, getterId);
        this.warnOnDepthLimit(path);
      }
      return obj;
    }

    // Create proxy
    const proxy = new Proxy(obj, {
      get: (target, prop) => {
        // Allow symbol properties to pass through
        if (typeof prop === 'symbol') {
          return Reflect.get(target, prop);
        }
        console.log('DependencyTracker get:', { target, prop });

        const propPath = [...path, prop as string];
        const pathStr = propPath.join('.');

        // Track access if tracking is enabled
        if (this.tracking) {
          this.addDependency(pathStr, getterId);

          if (this.debugMode) {
            console.log(`[DependencyTracker] Accessed: ${pathStr}`);
          }
        }

        console.log('DependencyTracker get - after tracking:', {
          target,
          prop,
        });

        const value = Reflect.get(target, prop);

        // Recursively proxy nested objects
        if (value !== null && typeof value === 'object') {
          return this.createTrackedProxy(value, propPath, getterId);
        }

        return value;
      },

      set: () => {
        throw new Error(
          'State mutations are not allowed during render. ' +
            'BlaC state should be updated via cubit methods (e.g., cubit.emit()).',
        );
      },

      deleteProperty: () => {
        throw new Error(
          'State mutations are not allowed during render. ' +
            'BlaC state should be updated via cubit methods.',
        );
      },
    });

    // Cache the proxy
    this.proxyCache.set(obj, proxy);
    return proxy;
  }

  /**
   * Check if any of the tracked dependencies have changed
   * @param prevDeps - Previously tracked dependencies
   * @param newState - New state to compare against
   * @param oldState - Old state to compare from
   * @returns True if any dependency changed
   */
  haveDependenciesChanged(
    prevDeps: Set<string>,
    newState: any,
    oldState: any,
  ): boolean {
    for (const dep of prevDeps) {
      const oldValue = this.getValueByPath(oldState, dep);
      const newValue = this.getValueByPath(newState, dep);
      console.log('DependencyTracker - dependency checking:', {
        dep,
        oldValue,
        newValue,
        consoleCheck: Object.is(oldValue, newValue),
      });

      if (!Object.is(oldValue, newValue)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get a value from an object by its path string
   * @param obj - Object to traverse
   * @param path - Dot-separated path (e.g., "user.profile.name")
   * @returns Value at the path, or undefined if not found
   */
  private getValueByPath(obj: any, path: string): any {
    if (!path) return obj;
    if (obj === null || obj === undefined) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Warn when depth limit is reached (development only)
   * @param path - Path where limit was reached
   */
  private warnOnDepthLimit(path: string[]): void {
    const pathStr = path.join('.');

    if (
      process.env.NODE_ENV === 'development' &&
      !this.depthWarnings.has(pathStr)
    ) {
      console.warn(
        `[DependencyTracker] Reached depth limit (${this.maxDepth}) at path: ${pathStr}\n` +
          `Consider increasing maxTrackingDepth or using an explicit selector for deep objects.`,
      );
      this.depthWarnings.add(pathStr);
    }
  }

  /**
   * Warn when tracking a large number of dependencies (development only)
   * @param deps - Set of dependencies
   */
  private warnOnLargeDependencySet(deps: Set<string>): void {
    if (process.env.NODE_ENV === 'development' && deps.size > 20) {
      console.warn(
        `[DependencyTracker] Tracking ${deps.size} dependencies.\n` +
          `Consider using an explicit selector for better performance.`,
      );
    }
  }

  /**
   * Clear the proxy cache
   * Should be called when state changes to avoid stale proxies
   */
  clearCache(): void {
    this.proxyCache = new WeakMap();
  }

  /**
   * Get debug information about the tracker state
   * @returns Debug information object
   */
  getDebugInfo() {
    return {
      tracking: this.tracking,
      dependencyCount: this.dependencies.size,
      dependencies: Array.from(this.dependencies).sort(),
      maxDepth: this.maxDepth,
      debugMode: this.debugMode,
    };
  }
}
