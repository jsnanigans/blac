/**
 * ReactBridge - Bridges BlaC v2 StateContainer with React using proxy tracking
 *
 * This bridge integrates automatic dependency tracking through proxies,
 * ensuring components only re-render when accessed properties change.
 */

import type { StateContainer } from '../../../blac/src/v2/core/StateContainer';
import { ProxyTracker } from '../../../blac/src/v2/proxy/ProxyTracker';
import type { Subscription } from '../../../blac/src/v2/subscription/SubscriptionSystem';
import { BlacLogger } from '../../../blac/src/v2/logging/Logger';

// Export type aliases for backward compatibility
export type SubscribeCallback = () => void;
export type Unsubscribe = () => void;

/**
 * Bridge between StateContainer and React with automatic proxy tracking
 */
export class ReactBridge<S> {
  private subscription: Subscription | null = null;
  private activeSubscriptionId: symbol | null = null; // Track which subscription is active
  private proxyTracker: ProxyTracker<S>;
  private trackedPaths = new Set<string>();
  private currentState: S;
  private listeners = new Set<() => void>();
  private isTracking = false;
  private renderGeneration = 0;

  constructor(
    private readonly container: StateContainer<S, any>
  ) {
    this.proxyTracker = new ProxyTracker<S>();
    this.currentState = container.state;
  }

  /**
   * Subscribe function for useSyncExternalStore
   * Called by React to subscribe to state changes
   */
  subscribe = (onStoreChange: () => void): (() => void) => {
    // Add React's listener
    this.listeners.add(onStoreChange);

    // Create subscription if not exists
    if (!this.subscription) {
      BlacLogger.debug('ReactBridge', 'Creating INITIAL subscription');
      const subscriptionId = Symbol('subscription');
      this.activeSubscriptionId = subscriptionId;
      // Subscribe without selector - we'll use proxy tracking instead
      this.subscription = this.container.subscribeAdvanced({
        callback: (state: S) => {
          // Guard against stale callbacks from old subscriptions
          if (subscriptionId !== this.activeSubscriptionId) {
            BlacLogger.debug('ReactBridge', 'INITIAL subscription callback IGNORED (stale subscription)');
            return;
          }
          BlacLogger.debug('ReactBridge', 'INITIAL subscription callback invoked');
          this.currentState = state;
          // Notify all React listeners
          this.listeners.forEach(listener => {
            BlacLogger.debug('ReactBridge', 'INITIAL Calling listener');
            listener();
          });
        },
        // Pass tracked paths as metadata for the subscription system
        metadata: {
          useProxyTracking: true,
          trackedPaths: Array.from(this.trackedPaths)
        }
      });
      BlacLogger.debug('ReactBridge', 'INITIAL subscription created');
    }

    // Return cleanup function
    return () => {
      this.listeners.delete(onStoreChange);

      // Cleanup subscription if no more listeners
      if (this.listeners.size === 0 && this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
    };
  };

  /**
   * Get snapshot function for useSyncExternalStore
   * Returns proxied state that tracks property access
   */
  getSnapshot = (): S => {
    // Start tracking if this is a new render cycle
    if (!this.isTracking) {
      this.isTracking = true;
      this.proxyTracker.startTracking();

      // Schedule tracking completion after render
      // Only queue one microtask per tracking cycle
      queueMicrotask(() => {
        this.completeTracking();
      });
    }

    // Increment render generation for tracking
    this.renderGeneration++;

    // Return proxied state that tracks access
    return this.proxyTracker.createProxy(this.currentState);
  };

  /**
   * Get server snapshot (same as client for now)
   */
  getServerSnapshot = (): S => {
    // No tracking on server - return raw state
    return this.currentState;
  };

  /**
   * Complete tracking and update subscription paths
   */
  private completeTracking(): void {
    BlacLogger.debug('ReactBridge', 'completeTracking called', { isTracking: this.isTracking });
    if (!this.isTracking) return;

    // Stop tracking and get paths
    const newPaths = this.proxyTracker.stopTracking();
    this.isTracking = false;
    BlacLogger.debug('ReactBridge', 'Tracked paths', { paths: Array.from(newPaths) });

    // IMPORTANT: Ignore empty path updates
    // This can happen when getSnapshot() is called but no properties are accessed
    // (e.g., during React's tearing detection checks or strict mode)
    if (newPaths.size === 0) {
      BlacLogger.debug('ReactBridge', 'Ignoring empty paths - likely a React internal check');
      return;
    }

    // Check if paths changed
    const hasChanged = newPaths.size !== this.trackedPaths.size ||
                      Array.from(newPaths).some(path => !this.trackedPaths.has(path));

    BlacLogger.debug('ReactBridge', 'Paths changed', {
      hasChanged,
      old: Array.from(this.trackedPaths),
      new: Array.from(newPaths)
    });

    if (hasChanged) {
      this.trackedPaths = newPaths;

      // Update subscription with new tracked paths
      if (this.subscription) {
        // We need to update the subscription's metadata
        // This will be picked up by ProxyTrackingStage
        this.updateSubscriptionPaths();
      }
    }
    BlacLogger.debug('ReactBridge', 'completeTracking done');
  }

  /**
   * Update subscription with new tracked paths
   */
  private updateSubscriptionPaths(): void {
    // Re-subscribe with updated paths
    if (this.subscription) {
      BlacLogger.debug('ReactBridge', 'updateSubscriptionPaths - creating new subscription', {
        paths: Array.from(this.trackedPaths)
      });
      const oldSub = this.subscription;

      // IMPORTANT: Unsubscribe old subscription BEFORE creating new one
      // to avoid race conditions where both subscriptions might process state changes
      BlacLogger.debug('ReactBridge', 'Unsubscribing old subscription FIRST');
      oldSub.unsubscribe();

      // Create new subscription with updated paths
      const subscriptionId = Symbol('subscription');
      this.activeSubscriptionId = subscriptionId;
      this.subscription = this.container.subscribeAdvanced({
        callback: (state: S) => {
          // Guard against stale callbacks from old subscriptions
          if (subscriptionId !== this.activeSubscriptionId) {
            BlacLogger.debug('ReactBridge', 'NEW subscription callback IGNORED (stale subscription)');
            return;
          }
          BlacLogger.debug('ReactBridge', 'NEW subscription callback invoked');
          this.currentState = state;
          this.listeners.forEach(listener => {
            BlacLogger.debug('ReactBridge', 'NEW Calling listener');
            listener();
          });
        },
        paths: Array.from(this.trackedPaths),
        metadata: {
          useProxyTracking: true,
          trackedPaths: Array.from(this.trackedPaths)
        }
      });

      BlacLogger.debug('ReactBridge', 'updateSubscriptionPaths complete');
    }
  }

  /**
   * Mount lifecycle - called when component mounts
   */
  onMount(callback?: (container: StateContainer<S, any>) => void): void {
    if (callback) {
      callback(this.container);
    }
  }

  /**
   * Unmount lifecycle - called when component unmounts
   */
  onUnmount(callback?: (container: StateContainer<S, any>) => void): void {
    if (callback) {
      callback(this.container);
    }

    // Cleanup
    this.dispose();
  }

  /**
   * Dispose of the bridge and cleanup resources
   */
  dispose(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    this.listeners.clear();
    this.trackedPaths.clear();
    this.proxyTracker.clearCache();
  }

  /**
   * Get the underlying container instance
   */
  getContainer(): StateContainer<S, any> {
    return this.container;
  }

  /**
   * Get currently tracked paths (for debugging)
   */
  getTrackedPaths(): ReadonlySet<string> {
    return new Set(this.trackedPaths);
  }
}

/**
 * Factory function to create a ReactBridge
 * Provides a simple API for useStateContainer
 */
export function createReactBridge<S>(container: StateContainer<S, any>): ReactBridge<S> {
  return new ReactBridge(container);
}
