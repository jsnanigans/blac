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
 * Dependencies function type - returns array of values to track
 */
export type DependenciesFunction<S, TBloc> = (
  state: S,
  bloc: TBloc,
) => any[];

/**
 * Bridge between StateContainer and React with automatic proxy tracking or dependencies mode
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

  // Dependencies mode
  private useDependencies: boolean;
  private dependenciesFunction?: DependenciesFunction<S, any>;
  private previousDependencies: any[] | null = null;

  constructor(
    private readonly container: StateContainer<S, any>,
    options?: {
      dependencies?: DependenciesFunction<S, any>;
    },
  ) {
    this.proxyTracker = new ProxyTracker<S>();
    this.currentState = container.state;
    this.useDependencies = !!options?.dependencies;
    this.dependenciesFunction = options?.dependencies;
  }

  /**
   * Subscribe function for useSyncExternalStore
   * Called by React to subscribe to state changes
   */
  subscribe = (onStoreChange: () => void): (() => void) => {
    const wasEmpty = this.listeners.size === 0;

    this.listeners.add(onStoreChange);

    if (!this.subscription) {
      BlacLogger.debug('ReactBridge', 'Creating INITIAL subscription', {
        mode: this.useDependencies ? 'dependencies' : 'proxy-tracking',
      });
      this.isInitialRender = true;
      const subscriptionId = Symbol('subscription');
      this.activeSubscriptionId = subscriptionId;
      this.subscription = this.container.subscribeAdvanced({
        callback: (state: unknown) => {
          const typedState = state as S;
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
          this.currentState = typedState;

          // In dependencies mode, check if dependencies have changed
          if (this.useDependencies && this.dependenciesFunction) {
            if (!this.shouldNotifyDependenciesChanged()) {
              BlacLogger.debug(
                'ReactBridge',
                '⏭️  Dependencies unchanged - skipping re-render',
              );
              return;
            }
          }

          BlacLogger.debug(
            'ReactBridge',
            '🔔 Notifying React listeners to trigger re-render',
            {
              listenerCount: this.listeners.size,
              reason: this.useDependencies
                ? 'Dependencies changed'
                : 'State changed and passed all filters',
            },
          );
          this.listeners.forEach((listener) => {
            listener();
          });
          BlacLogger.debug('ReactBridge', '✅ All listeners notified');
        },
        metadata: {
          useProxyTracking: !this.useDependencies,
          trackedPaths: this.useDependencies
            ? []
            : Array.from(this.trackedPaths),
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
   * Returns proxied state that tracks property access (proxy mode)
   * or raw state (dependencies mode)
   */
  getSnapshot = (): S => {
    // In dependencies mode, return raw state - no proxy tracking needed
    if (this.useDependencies) {
      BlacLogger.debug('ReactBridge', 'Returning raw state (dependencies mode)');
      return this.currentState;
    }

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
   * Skipped in dependencies mode
   */
  completeTracking(): void {
    // Skip in dependencies mode
    if (this.useDependencies) {
      BlacLogger.debug(
        'ReactBridge',
        'Skipping completeTracking - dependencies mode active',
      );
      return;
    }

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
        callback: (state: unknown) => {
          const typedState = state as S;
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
          this.currentState = typedState;

          // In dependencies mode, check if dependencies have changed
          if (this.useDependencies && this.dependenciesFunction) {
            if (!this.shouldNotifyDependenciesChanged()) {
              BlacLogger.debug(
                'ReactBridge',
                '⏭️  Dependencies unchanged - skipping re-render',
              );
              return;
            }
          }

          BlacLogger.debug(
            'ReactBridge',
            '🔔 Notifying React listeners to trigger re-render',
            {
              listenerCount: this.listeners.size,
              reason: this.useDependencies
                ? 'Dependencies changed'
                : 'State changed on tracked paths',
            },
          );
          this.listeners.forEach((listener) => {
            listener();
          });
          BlacLogger.debug('ReactBridge', '✅ All listeners notified');
        },
        paths: this.useDependencies ? [] : Array.from(this.trackedPaths),
        metadata: {
          useProxyTracking: !this.useDependencies,
          trackedPaths: this.useDependencies
            ? []
            : Array.from(this.trackedPaths),
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
   * Check if dependencies have changed
   * Compares current dependencies with previous dependencies
   * Returns true if changed (should notify), false if unchanged
   */
  private shouldNotifyDependenciesChanged(): boolean {
    if (!this.dependenciesFunction) {
      return true; // No dependencies function, always notify
    }

    const currentDeps = this.dependenciesFunction(
      this.currentState,
      this.container,
    );

    // First render or no previous dependencies - always notify
    if (this.previousDependencies === null) {
      this.previousDependencies = currentDeps;
      BlacLogger.debug('ReactBridge', 'Initial dependencies set', {
        dependencies: currentDeps,
      });
      return true;
    }

    // Check if length changed
    if (currentDeps.length !== this.previousDependencies.length) {
      BlacLogger.debug('ReactBridge', 'Dependencies length changed', {
        oldLength: this.previousDependencies.length,
        newLength: currentDeps.length,
      });
      this.previousDependencies = currentDeps;
      return true;
    }

    // Check if any value changed (using Object.is for comparison)
    for (let i = 0; i < currentDeps.length; i++) {
      if (!Object.is(currentDeps[i], this.previousDependencies[i])) {
        BlacLogger.debug('ReactBridge', 'Dependency changed at index', {
          index: i,
          oldValue: this.previousDependencies[i],
          newValue: currentDeps[i],
        });
        this.previousDependencies = currentDeps;
        return true;
      }
    }

    // No changes detected
    BlacLogger.debug('ReactBridge', 'All dependencies unchanged');
    return false;
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
