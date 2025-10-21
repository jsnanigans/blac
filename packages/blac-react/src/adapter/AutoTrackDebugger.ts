/**
 * AutoTrackDebugger
 *
 * Enhanced debugging utility for automatic dependency tracking system.
 * Provides formatted logging, performance metrics, and development insights.
 *
 * @module adapter/AutoTrackDebugger
 */

export interface DependencyChangeInfo {
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

export interface RerenderInfo {
  subscriptionId: string;
  willRerender: boolean;
  reason: string;
  changedDependencies?: string[];
  timestamp: number;
}

export interface PerformanceMetrics {
  trackingDuration: number;
  comparisonDuration: number;
  proxyCreationCount: number;
  dependencyCount: number;
}

/**
 * AutoTrackDebugger class for enhanced debugging of auto-tracking system
 */
export class AutoTrackDebugger {
  private enabled: boolean;
  private logPrefix = '[AutoTrack]';
  private performanceMetrics = new Map<string, PerformanceMetrics>();
  private changeHistory: DependencyChangeInfo[] = [];
  private rerenderHistory: RerenderInfo[] = [];
  private maxHistorySize = 100;

  constructor(enabled = false) {
    // Enable in development by default, or when explicitly enabled
    this.enabled = enabled || process.env.NODE_ENV === 'development';
  }

  /**
   * Enable or disable the debugger
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log a property access during tracking
   */
  logDependencyAccess(path: string, value: any): void {
    if (!this.enabled) return;

    console.log(`${this.logPrefix} 🔍 Accessed: ${path}`, {
      type: typeof value,
      value: this.formatValue(value),
    });
  }

  /**
   * Log the complete set of tracked dependencies for a subscription
   */
  logDependenciesTracked(subscriptionId: string, deps: Set<string>): void {
    if (!this.enabled) return;

    console.groupCollapsed(
      `${this.logPrefix} 📋 Dependencies for ${subscriptionId}`,
    );
    console.log('Count:', deps.size);
    console.log('Paths:', Array.from(deps).sort());
    console.groupEnd();
  }

  /**
   * Log a re-render decision with detailed reasoning
   */
  logReRenderDecision(
    subscriptionId: string,
    willRerender: boolean,
    reason: string,
    changedDependencies?: string[],
  ): void {
    if (!this.enabled) return;

    const emoji = willRerender ? '🔄' : '⏸️';
    const action = willRerender ? 'WILL' : 'WILL NOT';

    const info: RerenderInfo = {
      subscriptionId,
      willRerender,
      reason,
      changedDependencies,
      timestamp: Date.now(),
    };

    this.rerenderHistory.push(info);
    this.trimHistory(this.rerenderHistory);

    if (willRerender && changedDependencies && changedDependencies.length > 0) {
      console.groupCollapsed(
        `${this.logPrefix} ${emoji} ${subscriptionId}: ${action} re-render`,
      );
      console.log('Reason:', reason);
      console.log('Changed paths:', changedDependencies);
      console.groupEnd();
    } else {
      console.log(
        `${this.logPrefix} ${emoji} ${subscriptionId}: ${action} re-render`,
        reason,
      );
    }
  }

  /**
   * Log a dependency value change
   */
  logDependencyChange(path: string, oldValue: any, newValue: any): void {
    if (!this.enabled) return;

    const change: DependencyChangeInfo = {
      path,
      oldValue,
      newValue,
      timestamp: Date.now(),
    };

    this.changeHistory.push(change);
    this.trimHistory(this.changeHistory);

    console.log(`${this.logPrefix} 🔀 Changed: ${path}`, {
      old: this.formatValue(oldValue),
      new: this.formatValue(newValue),
    });
  }

  /**
   * Log performance metrics for tracking operations
   */
  logPerformanceMetrics(
    subscriptionId: string,
    metrics: PerformanceMetrics,
  ): void {
    if (!this.enabled) return;

    this.performanceMetrics.set(subscriptionId, metrics);

    console.groupCollapsed(
      `${this.logPrefix} ⏱️ Performance: ${subscriptionId}`,
    );
    console.log(
      'Tracking duration:',
      `${metrics.trackingDuration.toFixed(2)}ms`,
    );
    console.log(
      'Comparison duration:',
      `${metrics.comparisonDuration.toFixed(2)}ms`,
    );
    console.log('Proxy creations:', metrics.proxyCreationCount);
    console.log('Dependencies tracked:', metrics.dependencyCount);
    console.groupEnd();
  }

  /**
   * Log a warning about potential performance issues
   */
  logPerformanceWarning(message: string, details?: any): void {
    if (!this.enabled) return;

    console.warn(
      `${this.logPrefix} ⚠️ Performance Warning: ${message}`,
      details || '',
    );
  }

  /**
   * Log general informational message
   */
  logInfo(message: string, details?: any): void {
    if (!this.enabled) return;

    console.log(`${this.logPrefix} ℹ️ ${message}`, details || '');
  }

  /**
   * Get the complete change history
   */
  getChangeHistory(): DependencyChangeInfo[] {
    return [...this.changeHistory];
  }

  /**
   * Get the complete rerender history
   */
  getRerenderHistory(): RerenderInfo[] {
    return [...this.rerenderHistory];
  }

  /**
   * Get performance metrics for a specific subscription
   */
  getPerformanceMetrics(
    subscriptionId: string,
  ): PerformanceMetrics | undefined {
    return this.performanceMetrics.get(subscriptionId);
  }

  /**
   * Get aggregate performance statistics
   */
  getAggregateStats() {
    const metrics = Array.from(this.performanceMetrics.values());

    if (metrics.length === 0) {
      return null;
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => sum(arr) / arr.length;

    const trackingDurations = metrics.map((m) => m.trackingDuration);
    const comparisonDurations = metrics.map((m) => m.comparisonDuration);
    const dependencyCounts = metrics.map((m) => m.dependencyCount);

    return {
      subscriptionCount: metrics.length,
      avgTrackingDuration: avg(trackingDurations),
      maxTrackingDuration: Math.max(...trackingDurations),
      avgComparisonDuration: avg(comparisonDurations),
      maxComparisonDuration: Math.max(...comparisonDurations),
      avgDependencyCount: avg(dependencyCounts),
      maxDependencyCount: Math.max(...dependencyCounts),
      totalChanges: this.changeHistory.length,
      totalRerenders: this.rerenderHistory.filter((r) => r.willRerender).length,
      totalSkippedRerenders: this.rerenderHistory.filter((r) => !r.willRerender)
        .length,
    };
  }

  /**
   * Print a formatted summary report
   */
  printSummary(): void {
    if (!this.enabled) return;

    const stats = this.getAggregateStats();

    if (!stats) {
      console.log(`${this.logPrefix} No tracking data available`);
      return;
    }

    console.group(`${this.logPrefix} 📊 Auto-Tracking Summary`);
    console.log('Total subscriptions:', stats.subscriptionCount);
    console.log(
      'Average dependencies per subscription:',
      stats.avgDependencyCount.toFixed(1),
    );
    console.log('Max dependencies:', stats.maxDependencyCount);
    console.log('');
    console.log('Performance:');
    console.log(
      '  Avg tracking time:',
      `${stats.avgTrackingDuration.toFixed(2)}ms`,
    );
    console.log(
      '  Max tracking time:',
      `${stats.maxTrackingDuration.toFixed(2)}ms`,
    );
    console.log(
      '  Avg comparison time:',
      `${stats.avgComparisonDuration.toFixed(2)}ms`,
    );
    console.log('');
    console.log('Re-renders:');
    console.log('  Total triggered:', stats.totalRerenders);
    console.log('  Total skipped:', stats.totalSkippedRerenders);
    console.log(
      '  Skip rate:',
      `${((stats.totalSkippedRerenders / (stats.totalRerenders + stats.totalSkippedRerenders)) * 100).toFixed(1)}%`,
    );
    console.groupEnd();
  }

  /**
   * Clear all tracking history and metrics
   */
  clear(): void {
    this.performanceMetrics.clear();
    this.changeHistory = [];
    this.rerenderHistory = [];
  }

  /**
   * Format a value for display (prevent circular refs, large objects)
   */
  private formatValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value instanceof Set) return `Set(${value.size})`;
    if (value instanceof Map) return `Map(${value.size})`;
    if (value instanceof Date) return value.toISOString();
    if (value.constructor?.name) return `${value.constructor.name} {...}`;
    return '{...}';
  }

  /**
   * Trim history arrays to prevent memory growth
   */
  private trimHistory<T>(history: T[]): void {
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }
}

/**
 * Global singleton instance for convenience
 * Can be accessed via `AutoTrackDebugger.getInstance()`
 */
let globalInstance: AutoTrackDebugger | null = null;

export function getGlobalDebugger(): AutoTrackDebugger {
  if (!globalInstance) {
    globalInstance = new AutoTrackDebugger();
  }
  return globalInstance;
}

/**
 * Enable global debugging
 */
export function enableGlobalDebug(): void {
  getGlobalDebugger().setEnabled(true);
}

/**
 * Disable global debugging
 */
export function disableGlobalDebug(): void {
  getGlobalDebugger().setEnabled(false);
}
