
export interface DependencyMetrics {
  stateAccessCount: number;
  classAccessCount: number;
  proxyCreationCount: number;
  batchFlushCount: number;
  averageResolutionTime: number;
  memoryUsageKB: number;
}

export interface DependencyTrackerConfig {
  enableBatching: boolean;
  batchTimeout: number;
  enableMetrics: boolean;
  maxCacheSize: number;
  enableDeepTracking: boolean;
}

export type DependencyChangeCallback = (changedKeys: Set<string>) => void;

export class DependencyTracker {
  private stateKeys = new Set<string>();
  private classKeys = new Set<string>();
  private batchedCallbacks = new Set<DependencyChangeCallback>();
  private flushScheduled = false;
  private flushTimeoutId: number | undefined;
  
  private metrics: DependencyMetrics = {
    stateAccessCount: 0,
    classAccessCount: 0,
    proxyCreationCount: 0,
    batchFlushCount: 0,
    averageResolutionTime: 0,
    memoryUsageKB: 0,
  };
  
  private resolutionTimes: number[] = [];
  
  private config: DependencyTrackerConfig;
  
  private stateProxyCache = new WeakMap<object, object>();
  private classProxyCache = new WeakMap<object, object>();
  
  private lastStateSnapshot: unknown = null;
  private lastClassSnapshot: unknown = null;
  
  constructor(config: Partial<DependencyTrackerConfig> = {}) {
    this.config = {
      enableBatching: true,
      batchTimeout: 0, // Use React's scheduler
      enableMetrics: process.env.NODE_ENV === 'development',
      maxCacheSize: 1000,
      enableDeepTracking: false,
      ...config,
    };
  }

  public trackStateAccess(key: string): void {
    if (this.config.enableMetrics) {
      this.metrics.stateAccessCount++;
    }
    
    this.stateKeys.add(key);
    
    if (this.config.enableBatching) {
      this.scheduleFlush();
    }
  }

  public trackClassAccess(key: string): void {
    if (this.config.enableMetrics) {
      this.metrics.classAccessCount++;
    }
    
    this.classKeys.add(key);
    
    if (this.config.enableBatching) {
      this.scheduleFlush();
    }
  }

  public createStateProxy<T extends object>(target: T, onAccess?: (prop: string) => void): T {
    const cachedProxy = this.stateProxyCache.get(target);
    if (cachedProxy) {
      return cachedProxy as T;
    }

    const startTime = this.config.enableMetrics ? performance.now() : 0;

    const proxy = new Proxy(target, {
      get: (obj: T, prop: string | symbol) => {
        if (typeof prop === 'string') {
          this.trackStateAccess(prop);
          onAccess?.(prop);
        }
        
        const value = obj[prop as keyof T];
        
        if (
          this.config.enableDeepTracking &&
          value &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          return this.createStateProxy(value as object);
        }
        
        return value;
      },
      
      has: (obj: T, prop: string | symbol) => {
        return prop in obj;
      },
      
      ownKeys: (obj: T) => {
        return Reflect.ownKeys(obj);
      },
      
      getOwnPropertyDescriptor: (obj: T, prop: string | symbol) => {
        return Reflect.getOwnPropertyDescriptor(obj, prop);
      },
    });

    this.stateProxyCache.set(target, proxy);
    
    if (this.config.enableMetrics) {
      this.metrics.proxyCreationCount++;
      const endTime = performance.now();
      this.resolutionTimes.push(endTime - startTime);
      this.updateAverageResolutionTime();
    }

    return proxy;
  }

  /**
   * Create a high-performance proxy for class instances with smart caching
   */
  public createClassProxy<T extends object>(target: T, onAccess?: (prop: string) => void): T {
    const cachedProxy = this.classProxyCache.get(target);
    if (cachedProxy) {
      return cachedProxy as T;
    }

    const startTime = this.config.enableMetrics ? performance.now() : 0;

    const proxy = new Proxy(target, {
      get: (obj: T, prop: string | symbol) => {
        const value = obj[prop as keyof T];
        
        // Only track non-function properties for dependency resolution
        if (typeof prop === 'string' && typeof value !== 'function') {
          this.trackClassAccess(prop);
          onAccess?.(prop);
        }
        
        return value;
      },
    });

    this.classProxyCache.set(target, proxy);
    
    if (this.config.enableMetrics) {
      this.metrics.proxyCreationCount++;
      const endTime = performance.now();
      this.resolutionTimes.push(endTime - startTime);
      this.updateAverageResolutionTime();
    }

    return proxy;
  }

  /**
   * Get all currently tracked state dependencies
   */
  public getStateKeys(): Set<string> {
    return new Set(this.stateKeys);
  }

  /**
   * Get all currently tracked class dependencies
   */
  public getClassKeys(): Set<string> {
    return new Set(this.classKeys);
  }

  /**
   * Reset all tracked dependencies efficiently
   */
  public reset(): void {
    this.stateKeys.clear();
    this.classKeys.clear();
    this.cancelScheduledFlush();
  }

  /**
   * Subscribe to dependency change notifications with batching
   */
  public subscribe(callback: DependencyChangeCallback): () => void {
    this.batchedCallbacks.add(callback);
    
    return () => {
      this.batchedCallbacks.delete(callback);
    };
  }

  /**
   * Compute dependency array for React's useSyncExternalStore with optimization
   */
  public computeDependencyArray<TState, TClass>(
    state: TState,
    classInstance: TClass,
  ): unknown[] {
    const startTime = this.config.enableMetrics ? performance.now() : 0;
    
    // Fast path for primitive states
    if (typeof state !== 'object' || state === null) {
      return [[state]];
    }

    // Compute state dependencies
    const stateValues: unknown[] = [];
    for (const key of this.stateKeys) {
      if (key in (state as object)) {
        stateValues.push((state as any)[key]);
      }
    }

    // Compute class dependencies
    const classValues: unknown[] = [];
    for (const key of this.classKeys) {
      if (key in (classInstance as object)) {
        try {
          const value = (classInstance as any)[key];
          if (typeof value !== 'function') {
            classValues.push(value);
          }
        } catch (error) {
          // Silently ignore property access errors
        }
      }
    }

    if (this.config.enableMetrics) {
      const endTime = performance.now();
      this.resolutionTimes.push(endTime - startTime);
      this.updateAverageResolutionTime();
    }

    // Return optimized dependency array
    if (stateValues.length === 0 && classValues.length === 0) {
      return [[]]; // No dependencies tracked
    }
    
    if (classValues.length === 0) {
      return [stateValues]; // Only state dependencies
    }
    
    if (stateValues.length === 0) {
      return [classValues]; // Only class dependencies
    }
    
    return [stateValues, classValues]; // Both types of dependencies
  }

  /**
   * Get performance metrics for monitoring and optimization
   */
  public getMetrics(): DependencyMetrics {
    if (!this.config.enableMetrics) {
      return {
        stateAccessCount: 0,
        classAccessCount: 0,
        proxyCreationCount: 0,
        batchFlushCount: 0,
        averageResolutionTime: 0,
        memoryUsageKB: 0,
      };
    }

    // Estimate memory usage
    const estimatedMemory = 
      (this.stateKeys.size * 50) + // Rough estimate for Set storage
      (this.classKeys.size * 50) +
      (this.stateProxyCache instanceof WeakMap ? 100 : 0) +
      (this.classProxyCache instanceof WeakMap ? 100 : 0);

    return {
      ...this.metrics,
      memoryUsageKB: Math.round(estimatedMemory / 1024),
    };
  }

  /**
   * Clear all caches and reset metrics for memory management
   */
  public clearCaches(): void {
    this.stateProxyCache = new WeakMap();
    this.classProxyCache = new WeakMap();
    this.resolutionTimes = [];
    
    if (this.config.enableMetrics) {
      this.metrics = {
        stateAccessCount: 0,
        classAccessCount: 0,
        proxyCreationCount: 0,
        batchFlushCount: 0,
        averageResolutionTime: 0,
        memoryUsageKB: 0,
      };
    }
  }

  /**
   * Schedule a batched flush of dependency changes
   */
  private scheduleFlush(): void {
    if (this.flushScheduled) {
      return;
    }

    this.flushScheduled = true;

    if (this.config.batchTimeout > 0) {
      this.flushTimeoutId = window.setTimeout(() => {
        this.flushBatchedChanges();
      }, this.config.batchTimeout);
    } else {
      // Use React's scheduler for optimal batching
      if (typeof window !== 'undefined' && 'scheduler' in window) {
        // Use React's scheduler if available
        (window as any).scheduler?.unstable_scheduleCallback(
          (window as any).scheduler?.unstable_NormalPriority || 0,
          () => this.flushBatchedChanges(),
        );
      } else {
        // Fallback to immediate execution
        Promise.resolve().then(() => this.flushBatchedChanges());
      }
    }
  }

  /**
   * Cancel any scheduled flush operation
   */
  private cancelScheduledFlush(): void {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = undefined;
    }
    this.flushScheduled = false;
  }

  /**
   * Execute batched dependency change notifications
   */
  private flushBatchedChanges(): void {
    if (!this.flushScheduled) {
      return;
    }

    this.flushScheduled = false;
    this.flushTimeoutId = undefined;

    if (this.config.enableMetrics) {
      this.metrics.batchFlushCount++;
    }

    // Notify all subscribers of dependency changes
    const allChangedKeys = new Set([...this.stateKeys, ...this.classKeys]);
    
    for (const callback of this.batchedCallbacks) {
      try {
        callback(allChangedKeys);
      } catch (error) {
        console.error('Error in dependency change callback:', error);
      }
    }
  }

  /**
   * Update average resolution time for performance monitoring
   */
  private updateAverageResolutionTime(): void {
    if (this.resolutionTimes.length === 0) {
      return;
    }

    // Keep only the last 100 measurements for rolling average
    if (this.resolutionTimes.length > 100) {
      this.resolutionTimes = this.resolutionTimes.slice(-100);
    }

    const sum = this.resolutionTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResolutionTime = sum / this.resolutionTimes.length;
  }
}

/**
 * Factory function for creating optimized dependency trackers
 */
export function createDependencyTracker(
  config?: Partial<DependencyTrackerConfig>,
): DependencyTracker {
  return new DependencyTracker(config);
}

/**
 * Default dependency tracker instance for shared usage
 */
export const defaultDependencyTracker = createDependencyTracker();