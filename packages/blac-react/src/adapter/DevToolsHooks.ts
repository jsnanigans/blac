/**
 * DevToolsHooks
 *
 * Integration hooks for developer tools to inspect automatic dependency tracking.
 * Provides read-only access to tracking state, performance metrics, and re-render decisions.
 *
 * @module adapter/DevToolsHooks
 */

export interface DevToolsSubscriptionInfo {
  id: string;
  dependencies: string[];
  renderCount: number;
  lastNotifiedVersion: number;
  lastTrackedVersion: number;
  createdAt: number;
}

export interface DevToolsAdapterInfo {
  blocName: string;
  currentVersion: number;
  subscriptionCount: number;
  autoTrackingEnabled: boolean;
  subscriptions: DevToolsSubscriptionInfo[];
}

export interface DevToolsRerenderEvent {
  subscriptionId: string;
  blocName: string;
  version: number;
  changedDependencies: string[];
  timestamp: number;
}

export interface DevToolsPerformanceEvent {
  subscriptionId: string;
  blocName: string;
  operation: 'track' | 'compare' | 'notify';
  duration: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Global registry of adapters for DevTools inspection
 */
class DevToolsRegistry {
  private adapters = new Map<string, any>();
  private rerenderListeners = new Set<(event: DevToolsRerenderEvent) => void>();
  private performanceListeners = new Set<(event: DevToolsPerformanceEvent) => void>();
  private enabled = false;

  /**
   * Enable DevTools integration
   */
  enable(): void {
    this.enabled = true;
    if (typeof window !== 'undefined') {
      // Expose to window for browser DevTools extensions
      (window as any).__BLAC_DEVTOOLS__ = this;
    }
  }

  /**
   * Disable DevTools integration
   */
  disable(): void {
    this.enabled = false;
    if (typeof window !== 'undefined') {
      delete (window as any).__BLAC_DEVTOOLS__;
    }
  }

  /**
   * Check if DevTools is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register an adapter for inspection
   */
  registerAdapter(id: string, adapter: any): void {
    if (!this.enabled) return;
    this.adapters.set(id, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(id: string): void {
    this.adapters.delete(id);
  }

  /**
   * Get information about a specific adapter
   */
  getAdapterInfo(id: string): DevToolsAdapterInfo | null {
    if (!this.enabled) return null;

    const adapter = this.adapters.get(id);
    if (!adapter) return null;

    return adapter.getDevToolsInfo?.() || null;
  }

  /**
   * Get information about all registered adapters
   */
  getAllAdapters(): DevToolsAdapterInfo[] {
    if (!this.enabled) return [];

    const infos: DevToolsAdapterInfo[] = [];
    for (const adapter of this.adapters.values()) {
      const info = adapter.getDevToolsInfo?.();
      if (info) {
        infos.push(info);
      }
    }
    return infos;
  }

  /**
   * Listen for re-render events
   */
  onRerender(listener: (event: DevToolsRerenderEvent) => void): () => void {
    if (!this.enabled) return () => {};

    this.rerenderListeners.add(listener);
    return () => this.rerenderListeners.delete(listener);
  }

  /**
   * Emit a re-render event
   */
  emitRerender(event: DevToolsRerenderEvent): void {
    if (!this.enabled) return;

    for (const listener of this.rerenderListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[DevTools] Error in rerender listener:', error);
      }
    }
  }

  /**
   * Listen for performance events
   */
  onPerformance(listener: (event: DevToolsPerformanceEvent) => void): () => void {
    if (!this.enabled) return () => {};

    this.performanceListeners.add(listener);
    return () => this.performanceListeners.delete(listener);
  }

  /**
   * Emit a performance event
   */
  emitPerformance(event: DevToolsPerformanceEvent): void {
    if (!this.enabled) return;

    for (const listener of this.performanceListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[DevTools] Error in performance listener:', error);
      }
    }
  }

  /**
   * Get aggregate statistics across all adapters
   */
  getGlobalStats() {
    if (!this.enabled) return null;

    const adapters = this.getAllAdapters();

    const totalSubscriptions = adapters.reduce((sum, a) => sum + a.subscriptionCount, 0);
    const totalDependencies = adapters.reduce((sum, a) => {
      return sum + a.subscriptions.reduce((s, sub) => s + sub.dependencies.length, 0);
    }, 0);

    const avgDependenciesPerSubscription =
      totalSubscriptions > 0 ? totalDependencies / totalSubscriptions : 0;

    return {
      adapterCount: adapters.length,
      totalSubscriptions,
      totalDependencies,
      avgDependenciesPerSubscription,
      autoTrackingEnabledCount: adapters.filter(a => a.autoTrackingEnabled).length
    };
  }

  /**
   * Clear all registered adapters (for testing)
   */
  clear(): void {
    this.adapters.clear();
    this.rerenderListeners.clear();
    this.performanceListeners.clear();
  }
}

/**
 * Global DevTools registry singleton
 */
export const devToolsRegistry = new DevToolsRegistry();

/**
 * Enable DevTools integration globally
 */
export function enableDevTools(): void {
  devToolsRegistry.enable();
  console.log('[BlaC DevTools] Enabled - Access via window.__BLAC_DEVTOOLS__');
}

/**
 * Disable DevTools integration globally
 */
export function disableDevTools(): void {
  devToolsRegistry.disable();
}

/**
 * Check if DevTools is enabled
 */
export function isDevToolsEnabled(): boolean {
  return devToolsRegistry.isEnabled();
}

/**
 * Helper to measure and report performance
 */
export function measurePerformance<T>(
  operation: 'track' | 'compare' | 'notify',
  subscriptionId: string,
  blocName: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  if (!devToolsRegistry.isEnabled()) {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  devToolsRegistry.emitPerformance({
    subscriptionId,
    blocName,
    operation,
    duration,
    metadata,
    timestamp: Date.now()
  });

  return result;
}

/**
 * Report a re-render event to DevTools
 */
export function reportRerender(
  subscriptionId: string,
  blocName: string,
  version: number,
  changedDependencies: string[]
): void {
  if (!devToolsRegistry.isEnabled()) return;

  devToolsRegistry.emitRerender({
    subscriptionId,
    blocName,
    version,
    changedDependencies,
    timestamp: Date.now()
  });
}
