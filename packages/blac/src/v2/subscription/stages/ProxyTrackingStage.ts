/**
 * ProxyTrackingStage - Integrates automatic dependency tracking into subscription pipeline
 *
 * This stage manages proxy-based tracking for subscriptions that need automatic
 * dependency detection. It works in conjunction with FilterStage to ensure
 * components only re-render when accessed properties change.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';
import { ProxyTracker } from '../../proxy/ProxyTracker';
import { BlacLogger } from '../../logging/Logger';

export interface ProxyTrackingOptions {
  /**
   * Enable automatic proxy tracking
   */
  enabled?: boolean;

  /**
   * Maximum depth for tracking nested properties
   */
  maxDepth?: number;

  /**
   * Exclude certain paths from tracking
   */
  excludePaths?: string[];

  /**
   * Force certain paths to always be tracked
   */
  forcePaths?: string[];
}

/**
 * Manages proxy tracking for automatic dependency detection
 */
export class ProxyTrackingStage extends PipelineStage {
  private readonly trackers = new WeakMap<object, ProxyTracker<any>>();
  private readonly options: ProxyTrackingOptions;

  constructor(options: ProxyTrackingOptions = {}) {
    super('ProxyTracking', 850); // Run before FilterStage (900)
    this.options = {
      enabled: options.enabled !== false,
      maxDepth: options.maxDepth ?? 10,
      excludePaths: options.excludePaths ?? [],
      forcePaths: options.forcePaths ?? []
    };
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    // Skip if proxy tracking is disabled
    if (!this.options.enabled) {
      BlacLogger.debug('ProxyTrackingStage', 'Proxy tracking disabled globally');
      return context;
    }

    // Check if this subscription uses proxy tracking
    const useProxyTracking = context.metadata.get('useProxyTracking');
    if (useProxyTracking === false) {
      BlacLogger.debug('ProxyTrackingStage', 'Proxy tracking disabled for subscription', {
        subscriptionId: context.subscriptionId
      });
      return context;
    }

    // Get or create tracker for this subscription
    const subscription = context.subscription;
    let tracker = this.trackers.get(subscription);

    if (!tracker) {
      tracker = new ProxyTracker();
      if (this.options.maxDepth) {
        tracker.setMaxDepth(this.options.maxDepth);
      }
      this.trackers.set(subscription, tracker);
      BlacLogger.debug('ProxyTrackingStage', 'Created new ProxyTracker for subscription', {
        subscriptionId: context.subscriptionId,
        maxDepth: this.options.maxDepth
      });
    }

    // Get tracked paths from metadata (can be array or Set)
    const trackedPathsRaw = context.metadata.get('trackedPaths');
    const previousTrackedPaths = trackedPathsRaw instanceof Set
      ? trackedPathsRaw as Set<string>
      : trackedPathsRaw ? new Set(trackedPathsRaw as string[]) : undefined;

    // Get current tracked paths from metadata (set by React during render)
    const currentTrackedPaths = context.metadata.get('currentTrackedPaths') as Set<string> | undefined;

    if (currentTrackedPaths) {
      // Update the subscription's tracked paths
      this.updateTrackedPaths(context, currentTrackedPaths);

      // Store for next comparison
      context.metadata.set('trackedPaths', currentTrackedPaths);
      context.metadata.delete('currentTrackedPaths'); // Clean up temporary paths
    }

    // If we have tracked paths, update filter configuration
    if (previousTrackedPaths && previousTrackedPaths.size > 0) {
      // Convert tracked paths to filter paths
      const filterPaths = Array.from(previousTrackedPaths)
        .filter(path => !this.options.excludePaths?.includes(path));

      // Add forced paths
      if (this.options.forcePaths && this.options.forcePaths.length > 0) {
        filterPaths.push(...this.options.forcePaths);
        BlacLogger.debug('ProxyTrackingStage', 'Added forced paths', {
          forcedPaths: this.options.forcePaths
        });
      }

      // Set paths for FilterStage to use
      context.subscription.config.paths = filterPaths;
      context.metadata.set('filterPaths', filterPaths);

      BlacLogger.debug('ProxyTrackingStage', 'Applied tracked paths to filter', {
        subscriptionId: context.subscriptionId,
        pathCount: filterPaths.length,
        paths: filterPaths
      });
    }

    return context;
  }

  /**
   * Update tracked paths for a subscription
   */
  private updateTrackedPaths<T>(context: PipelineContext<T>, paths: Set<string>): void {
    // Check if paths have actually changed
    const previousPaths = context.metadata.get('trackedPaths') as Set<string> | undefined;

    if (previousPaths) {
      const hasChanged = paths.size !== previousPaths.size ||
                        Array.from(paths).some(path => !previousPaths.has(path));

      if (!hasChanged) {
        BlacLogger.debug('ProxyTrackingStage', 'Paths unchanged, skipping update');
        return; // No change needed
      }
    }

    // Update subscription configuration with new paths
    const pathArray = Array.from(paths);
    context.subscription.config.paths = pathArray;

    BlacLogger.debug('ProxyTrackingStage', 'Updated tracked paths', {
      subscriptionId: context.subscriptionId,
      previousCount: previousPaths?.size ?? 0,
      newCount: pathArray.length,
      paths: pathArray
    });
  }

  /**
   * Create a proxied state for tracking
   */
  createProxiedState<T>(state: T, subscription: any): T {
    let tracker = this.trackers.get(subscription);

    if (!tracker) {
      tracker = new ProxyTracker<T>();
      if (this.options.maxDepth) {
        tracker.setMaxDepth(this.options.maxDepth);
      }
      this.trackers.set(subscription, tracker);
    }

    return tracker.createProxy(state);
  }

  /**
   * Start tracking for a subscription
   */
  startTracking(subscription: any): void {
    const tracker = this.trackers.get(subscription);
    if (tracker) {
      tracker.startTracking();
    }
  }

  /**
   * Stop tracking and get tracked paths
   */
  stopTracking(subscription: any): Set<string> {
    const tracker = this.trackers.get(subscription);
    if (tracker) {
      return tracker.stopTracking();
    }
    return new Set();
  }

  /**
   * Clean up tracker for a subscription
   */
  cleanup(subscription: any): void {
    const tracker = this.trackers.get(subscription);
    if (tracker) {
      tracker.clearCache();
      this.trackers.delete(subscription);
    }
  }

  /**
   * Check if a subscription has proxy tracking enabled
   */
  isTrackingEnabled(subscription: any): boolean {
    return this.options.enabled && this.trackers.has(subscription);
  }
}