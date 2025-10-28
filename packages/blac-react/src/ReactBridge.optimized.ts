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
  private activeSubscriptionId = 0; // OPTIMIZATION: Use number instead of Symbol
  private proxyTracker: ProxyTracker<S>;
  private trackedPaths = new Set<string>();
  private currentState: S;
  private listeners: (() => void)[] = []; // OPTIMIZATION: Array for faster iteration
  private isTracking = false;
  private renderGeneration = 0;
  private isInitialRender = true;

  // Dependencies mode
  private useDependencies: boolean;
  private dependenciesFunction?: DependenciesFunction<S, any>;
  private previousDependencies: any[] | null = null;

  // OPTIMIZATION: Cache for tracked paths array
  private cachedPathsArray: string[] | null = null;
  private lastPathsVersion = 0;
  private currentPathsVersion = 0;

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
   * Creates a subscription callback that handles state changes
   * @param subscriptionId - Number to guard against stale subscriptions
   * @param context - Label for logging ('INITIAL' or 'NEW')
   * @private
   */
  private createSubscriptionCallback(
    subscriptionId: number,
    context: 'INITIAL' | 'NEW',
  ): (state: unknown) => void {
    return (state: unknown) => {
      const typedState = state as S;

      // Guard against stale callbacks from old subscriptions
      if (subscriptionId !== this.activeSubscriptionId) {
        BlacLogger.debug(
          'ReactBridge',
          `${context} subscription callback IGNORED (stale subscription)`,
        );
        return;
      }

      BlacLogger.debug(
        'ReactBridge',
        `📥 ${context} subscription callback invoked`,
        { listenerCount: this.listeners.length },
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

      const reason = this.useDependencies
        ? 'Dependencies changed'
        : context === 'INITIAL'
          ? 'State changed and passed all filters'
          : 'State changed on tracked paths';

      BlacLogger.debug(
        'ReactBridge',
        '🔔 Notifying React listeners to trigger re-render',
        { listenerCount: this.listeners.length, reason },
      );

      // OPTIMIZATION: Use for loop instead of forEach
      // Note: Listeners should not call unsubscribe() during notification
      // to avoid array modification during iteration
      const listeners = this.listeners;
      const len = listeners.length;
      for (let i = 0; i < len; i++) {
        listeners[i]();
      }

      BlacLogger.debug('ReactBridge', '✅ All listeners notified');
    };
  }

  /**
   * Subscribe function for useSyncExternalStore
   * Called by React to subscribe to state changes
   */
  subscribe = (onStoreChange: () => void): (() => void) => {
    const wasEmpty = this.listeners.length === 0;

    this.listeners.push(onStoreChange);

    if (!this.subscription) {
      BlacLogger.debug('ReactBridge', 'Creating INITIAL subscription', {
        mode: this.useDependencies ? 'dependencies' : 'proxy-tracking',
      });
      this.isInitialRender = true;
      this.activeSubscriptionId++; // OPTIMIZATION: Increment instead of Symbol
      const subscriptionId = this.activeSubscriptionId;
      this.subscription = this.container.subscribeAdvanced({
        callback: this.createSubscriptionCallback(subscriptionId, 'INITIAL'),
        metadata: {
          useProxyTracking: !this.useDependencies,
          trackedPaths: this.useDependencies
            ? []
            : this.getTrackedPathsArray(), // OPTIMIZATION: Use cached array
        },
      });
      BlacLogger.debug('ReactBridge', 'INITIAL subscription created');
    } else if (wasEmpty && this.listeners.length === 1) {
      BlacLogger.debug(
        'ReactBridge',
        'Remount detected - resetting isInitialRender flag',
      );
      this.isInitialRender = true;
    }

    return () => {
      // OPTIMIZATION: Fast array removal
      const index = this.listeners.indexOf(onStoreChange);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }

      if (this.listeners.length === 0 && this.subscription) {
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
      // IMPORTANT: Capture initial dependencies on first getSnapshot call
      // This ensures we have a baseline to compare against for subsequent state changes
      if (this.previousDependencies === null && this.dependenciesFunction) {
        this.previousDependencies = this.dependenciesFunction(
          this.currentState,
          this.container,
        );
        BlacLogger.debug(
          'ReactBridge',
          'Initial dependencies captured during render',
          {
            dependencies: this.previousDependencies,
          },
        );
      }

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
   * OPTIMIZATION: Get cached array of tracked paths
   */
  private getTrackedPathsArray(): string[] {
    if (this.cachedPathsArray === null || this.lastPathsVersion !== this.currentPathsVersion) {
      this.cachedPathsArray = Array.from(this.trackedPaths);
      this.lastPathsVersion = this.currentPathsVersion;
    }
    return this.cachedPathsArray;
  }

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

    // OPTIMIZATION: Faster path comparison
    const hasChanged = this.hasPathsChanged(newPaths);

    BlacLogger.debug('ReactBridge', 'Paths changed', {
      hasChanged,
      old: Array.from(this.trackedPaths),
      new: Array.from(newPaths),
    });

    if (hasChanged) {
      this.trackedPaths = newPaths;
      this.currentPathsVersion++; // Invalidate cache

      if (this.subscription) {
        this.updateSubscriptionPaths();
      }
    }
    BlacLogger.debug('ReactBridge', 'completeTracking done');
  }

  /**
   * OPTIMIZATION: Faster path comparison
   */
  private hasPathsChanged(newPaths: Set<string>): boolean {
    if (newPaths.size !== this.trackedPaths.size) {
      return true;
    }

    // Fast path: if sizes are same, check if all new paths exist in old
    for (const path of newPaths) {
      if (!this.trackedPaths.has(path)) {
        return true;
      }
    }

    return false;
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

      this.activeSubscriptionId++; // OPTIMIZATION: Increment instead of Symbol
      const subscriptionId = this.activeSubscriptionId;
      this.subscription = this.container.subscribeAdvanced({
        callback: this.createSubscriptionCallback(subscriptionId, 'NEW'),
        paths: this.useDependencies ? [] : this.getTrackedPathsArray(),
        metadata: {
          useProxyTracking: !this.useDependencies,
          trackedPaths: this.useDependencies
            ? []
            : this.getTrackedPathsArray(),
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

    // If previousDependencies is still null here, it means getSnapshot() was never called
    // This is unexpected but we handle it defensively
    if (this.previousDependencies === null) {
      this.previousDependencies = currentDeps;
      BlacLogger.warn(
        'ReactBridge',
        'Dependencies initialized in callback (unexpected - should have been set in getSnapshot)',
        {
          dependencies: currentDeps,
        },
      );
      return false; // Don't notify if we're just initializing
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

    // OPTIMIZATION: Fast comparison for primitives, fallback to Object.is for objects
    const prevDeps = this.previousDependencies;
    for (let i = 0; i < currentDeps.length; i++) {
      const curr = currentDeps[i];
      const prev = prevDeps[i];

      // Determine if value has changed
      // For objects: use Object.is
      // For primitives: use !== (faster than Object.is)
      const hasChanged =
        (typeof curr === 'object' || typeof prev === 'object')
          ? !Object.is(curr, prev)
          : curr !== prev;

      if (hasChanged) {
        BlacLogger.debug('ReactBridge', 'Dependency changed at index', {
          index: i,
          oldValue: prev,
          newValue: curr,
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

    this.listeners.length = 0; // OPTIMIZATION: Fast array clear
    this.trackedPaths.clear();
    this.proxyTracker.clearCache();
    this.cachedPathsArray = null; // Clear cache
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
