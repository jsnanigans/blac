/**
 * ReactBridge - Bridges StateContainer with React using proxy tracking
 *
 * This bridge integrates automatic dependency tracking through proxies,
 * ensuring components only re-render when accessed properties change.
 */

import type { StateContainer } from '@blac/core';
import { ProxyTracker } from '@blac/core';
import type { Subscription } from '@blac/core';
import { BlacLogger } from '@blac/core';

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
  private isInitialRender = true;

  constructor(private readonly container: StateContainer<S, any>) {
    this.proxyTracker = new ProxyTracker<S>();
    this.currentState = container.state;
  }

  /**
   * Subscribe function for useSyncExternalStore
   * Called by React to subscribe to state changes
   */
  subscribe = (onStoreChange: () => void): (() => void) => {
    const wasEmpty = this.listeners.size === 0;

    this.listeners.add(onStoreChange);

    if (!this.subscription) {
      BlacLogger.debug('ReactBridge', 'Creating INITIAL subscription');
      this.isInitialRender = true;
      const subscriptionId = Symbol('subscription');
      this.activeSubscriptionId = subscriptionId;
      this.subscription = this.container.subscribeAdvanced({
        callback: (state: S) => {
          // Guard against stale callbacks from old subscriptions
          if (subscriptionId !== this.activeSubscriptionId) {
            BlacLogger.debug(
              'ReactBridge',
              'INITIAL subscription callback IGNORED (stale subscription)',
            );
            return;
          }
          BlacLogger.debug(
            'ReactBridge',
            '📥 INITIAL subscription callback invoked',
            {
              listenerCount: this.listeners.size,
            },
          );
          this.currentState = state;
          BlacLogger.debug(
            'ReactBridge',
            '🔔 Notifying React listeners to trigger re-render',
            {
              listenerCount: this.listeners.size,
              reason: 'State changed and passed all filters',
            },
          );
          this.listeners.forEach((listener) => {
            listener();
          });
          BlacLogger.debug('ReactBridge', '✅ All listeners notified');
        },
        metadata: {
          useProxyTracking: true,
          trackedPaths: Array.from(this.trackedPaths),
        },
      });
      BlacLogger.debug('ReactBridge', 'INITIAL subscription created');
    } else if (wasEmpty && this.listeners.size === 1) {
      BlacLogger.debug(
        'ReactBridge',
        'Remount detected - resetting isInitialRender flag',
      );
      this.isInitialRender = true;
    }

    return () => {
      this.listeners.delete(onStoreChange);

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
    if (!this.isTracking) {
      this.isTracking = true;
      this.proxyTracker.startTracking();
      BlacLogger.debug(
        'ReactBridge',
        'Started proxy tracking for render cycle',
        {
          renderGeneration: this.renderGeneration,
          isInitialRender: this.isInitialRender,
        },
      );
    }

    this.renderGeneration++;

    BlacLogger.debug('ReactBridge', 'Creating proxied state snapshot', {
      renderGeneration: this.renderGeneration,
    });

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
   * Public method to be called from useBloc's useEffect
   */
  completeTracking(): void {
    BlacLogger.debug('ReactBridge', 'completeTracking called', {
      isTracking: this.isTracking,
    });

    if (!this.isTracking) {
      BlacLogger.debug(
        'ReactBridge',
        'Skipping completion - not currently tracking',
      );
      return;
    }

    const newPaths = this.proxyTracker.stopTracking();
    this.isTracking = false;
    BlacLogger.debug('ReactBridge', 'Tracked paths', {
      paths: Array.from(newPaths),
    });

    // IMPORTANT: Ignore empty path updates
    // This can happen when getSnapshot() is called but no properties are accessed
    // (e.g., during React's tearing detection checks or strict mode)
    if (newPaths.size === 0) {
      BlacLogger.debug(
        'ReactBridge',
        'Ignoring empty paths - likely a React internal check',
      );
      return;
    }

    const hasChanged =
      newPaths.size !== this.trackedPaths.size ||
      Array.from(newPaths).some((path) => !this.trackedPaths.has(path));

    BlacLogger.debug('ReactBridge', 'Paths changed', {
      hasChanged,
      old: Array.from(this.trackedPaths),
      new: Array.from(newPaths),
    });

    if (hasChanged) {
      this.trackedPaths = newPaths;

      if (this.subscription) {
        this.updateSubscriptionPaths();
      }
    }
    BlacLogger.debug('ReactBridge', 'completeTracking done');
  }

  /**
   * Update subscription with new tracked paths
   */
  private updateSubscriptionPaths(): void {
    if (this.subscription) {
      BlacLogger.debug(
        'ReactBridge',
        'updateSubscriptionPaths - creating new subscription',
        {
          paths: Array.from(this.trackedPaths),
        },
      );
      const oldSub = this.subscription;

      const subscriptionId = Symbol('subscription');
      this.activeSubscriptionId = subscriptionId;
      this.subscription = this.container.subscribeAdvanced({
        callback: (state: S) => {
          // Guard against stale callbacks from old subscriptions
          if (subscriptionId !== this.activeSubscriptionId) {
            BlacLogger.debug(
              'ReactBridge',
              'NEW subscription callback IGNORED (stale subscription)',
            );
            return;
          }
          BlacLogger.debug(
            'ReactBridge',
            '📥 NEW subscription callback invoked',
            {
              listenerCount: this.listeners.size,
            },
          );
          this.currentState = state;
          BlacLogger.debug(
            'ReactBridge',
            '🔔 Notifying React listeners to trigger re-render',
            {
              listenerCount: this.listeners.size,
              reason: 'State changed on tracked paths',
            },
          );
          this.listeners.forEach((listener) => {
            listener();
          });
          BlacLogger.debug('ReactBridge', '✅ All listeners notified');
        },
        paths: Array.from(this.trackedPaths),
        metadata: {
          useProxyTracking: true,
          trackedPaths: Array.from(this.trackedPaths),
        },
      });

      BlacLogger.debug(
        'ReactBridge',
        'Unsubscribing old subscription AFTER creating new',
      );
      oldSub.unsubscribe();

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
 */
export function createReactBridge<S>(
  container: StateContainer<S, any>,
): ReactBridge<S> {
  return new ReactBridge(container);
}
