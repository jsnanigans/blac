/**
 * ReactBlocAdapter
 *
 * Bridge layer between BlaC state management and React's lifecycle requirements.
 * Implements the Hybrid Adapter Pattern to achieve 100% React 18 compatibility.
 *
 * Key Features:
 * - Stable subscription model compatible with useSyncExternalStore
 * - Version-based change detection for efficient updates
 * - Support for both automatic (proxy) and explicit (selector) dependency tracking
 * - Reference counting for precise lifecycle management
 * - Snapshot generation for immutable state access
 * - React Strict Mode compatible by design
 *
 * @module adapter/ReactBlocAdapter
 */

import type { BlocBase } from '@blac/core';
import { Blac } from '@blac/core';
import { DependencyTracker } from './DependencyTracker';

/**
 * Selector function type - extracts specific data from state
 */
export type Selector<S, R = any> = (state: S) => R;

/**
 * Comparison function for selector results
 */
export type CompareFn<R> = (prev: R | undefined, next: R) => boolean;

/**
 * Subscription record for tracking individual component subscriptions
 */
interface AdapterSubscription<R = any> {
  /** Unique subscription ID */
  id: string;
  /** Callback to notify React of changes */
  notify: () => void;
  /** Optional selector for fine-grained subscriptions */
  selector?: Selector<any, R>;
  /** Optional custom comparison function */
  compare?: CompareFn<R>;
  /** Last selector result (for change detection) */
  lastResult?: R;
  /** Version when this subscription was last notified */
  lastNotifiedVersion: number;
  /** Creation timestamp */
  createdAt: number;
  /** Reference count (for batched subscriptions) */
  refCount: number;
  /** Tracked dependencies for auto-tracking */
  trackedDependencies?: Set<string>;
  /** Render count for periodic re-tracking */
  renderCount?: number;
  /** Last version when dependencies were tracked */
  lastTrackedVersion?: number;
}

/**
 * Snapshot of bloc state at a specific version
 */
interface StateSnapshot<S> {
  /** The state data */
  state: S;
  /** Version number */
  version: number;
  /** Timestamp when snapshot was created */
  timestamp: number;
}

/**
 * Default shallow equality comparison
 */
function shallowEqual<R>(prev: R | undefined, next: R): boolean {
  if (Object.is(prev, next)) {
    return true;
  }

  if (
    typeof prev !== 'object' ||
    prev === null ||
    typeof next !== 'object' ||
    next === null
  ) {
    return false;
  }

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (
      !Object.prototype.hasOwnProperty.call(next, key) ||
      !Object.is((prev as any)[key], (next as any)[key])
    ) {
      return false;
    }
  }

  return true;
}

/**
 * ReactBlocAdapter
 *
 * Manages the connection between a Bloc and React components.
 * Each Bloc gets one adapter that manages multiple component subscriptions.
 *
 * Architecture:
 * - One adapter per Bloc instance
 * - Adapter caches state snapshots
 * - Version-based change detection
 * - Reference counting for lifecycle management
 *
 * @template S - State type of the Bloc
 */
export class ReactBlocAdapter<S = any> {
  /** Reference to the Bloc being adapted */
  private bloc: BlocBase<S>;

  /** Map of active subscriptions */
  private subscriptions = new Map<string, AdapterSubscription>();

  /** Current version (increments on every state change) */
  private version = 0;

  /** Cached snapshot of current state */
  private snapshot: StateSnapshot<S>;

  /** Previous snapshot for dependency comparison */
  private previousSnapshot: StateSnapshot<S> | null = null;

  /** Cache for selector results to ensure stable references */
  private selectorCache = new Map<Selector<S, any>, any>();

  /** Subscription to bloc's state changes */
  private blocSubscription: (() => void) | null = null;

  /** Total number of components subscribed */
  private subscriberCount = 0;

  /** Generation counter for managing cleanup (similar to disposal pattern) */
  private generation = 0;

  /** Dependency tracker for auto-tracking (null if disabled) */
  private dependencyTracker: DependencyTracker | null = null;

  /** Whether auto-tracking is enabled */
  private autoTrackingEnabled = true;

  /** Pending tracked states awaiting dependency extraction */
  private pendingTrackedStates = new Map<string, any>();

  private subscriptionIdRef?: { current: string };

  /**
   * Create a new adapter for a Bloc
   *
   * @param bloc - The Bloc instance to adapt
   */
  constructor(bloc: BlocBase<S>, subscriptionIdRef?: { current: string }) {
    this.bloc = bloc;
    this.subscriptionIdRef = subscriptionIdRef;

    // Create initial snapshot
    this.snapshot = {
      state: bloc.state,
      version: this.version,
      timestamp: Date.now(),
    };

    // Check global config for auto-tracking
    const blacConfig = Blac.config;
    this.autoTrackingEnabled =
      blacConfig.proxyDependencyTracking !== false &&
      bloc.config.proxyDependencyTracking !== false;

    // Initialize dependency tracker if auto-tracking is enabled
    if (this.autoTrackingEnabled) {
      const maxDepth =
        this.bloc.config.proxyMaxDepth || blacConfig.proxyMaxDepth || 2;
      this.dependencyTracker = new DependencyTracker(maxDepth);

      // Enable debug mode in development
      if (process.env.NODE_ENV === 'development') {
        this.dependencyTracker.enableDebug(true);
      }
    }

    // Subscribe to bloc state changes
    this.subscribeToBloc();
  }

  /**
   * Subscribe to the underlying Bloc's state changes
   * @private
   */
  private subscribeToBloc(): void {
    // Use the bloc's subscription system to get notified of changes
    const result = this.bloc._subscriptionManager.subscribe({
      type: 'observer',
      notify: () => {
        // Store previous snapshot for dependency comparison
        this.previousSnapshot = this.snapshot;

        // State changed - increment version and update snapshot
        this.version++;
        this.snapshot = {
          state: this.bloc.state,
          version: this.version,
          timestamp: Date.now(),
        };

        // Clear proxy cache when state changes
        if (this.dependencyTracker) {
          this.dependencyTracker.clearCache();
        }

        // Notify all subscriptions
        this.notifySubscriptions();
      },
    });

    this.blocSubscription = result.unsubscribe;
  }

  /**
   * Notify subscriptions of state changes
   *
   * Evaluates selectors and only notifies if results changed.
   * For auto-tracked subscriptions, checks if tracked dependencies changed.
   * This is where the efficiency of the adapter pattern shines.
   *
   * @private
   */
  private notifySubscriptions(): void {
    // Clear selector cache on state changes
    this.selectorCache.clear();

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[ReactBlocAdapter] State changed, notifying subscriptions. Version: ${this.version}`,
      );
    }

    for (const subscription of this.subscriptions.values()) {
      // Skip if already notified for this version
      if (subscription.lastNotifiedVersion === this.version) {
        continue;
      }

      let shouldNotify = false;

      if (subscription.selector) {
        // Selector path - evaluate selector with new state
        const result = subscription.selector(this.snapshot.state);

        // Compare with last result
        const compare = subscription.compare || shallowEqual;
        const hasChanged = !compare(subscription.lastResult, result);

        if (hasChanged) {
          subscription.lastResult = result;
          shouldNotify = true;
        }
      } else if (
        this.autoTrackingEnabled &&
        subscription.trackedDependencies &&
        subscription.trackedDependencies.size > 0 &&
        this.previousSnapshot
      ) {
        // Auto-tracking path - check if tracked dependencies changed
        console.log(
          `[ReactBlocAdapter] Checking tracked dependencies for ${subscription.id}:`,
          Array.from(subscription.trackedDependencies),
          {
            prevState: this.previousSnapshot.state,
            newState: this.snapshot.state,
          },
        );
        shouldNotify = this.dependencyTracker!.haveDependenciesChanged(
          subscription.trackedDependencies,
          this.snapshot.state,
          this.previousSnapshot.state,
        );

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[ReactBlocAdapter] Checking ${subscription.id}: shouldNotify=${shouldNotify}, deps=${Array.from(subscription.trackedDependencies)}`,
          );
          if (shouldNotify) {
            console.log(
              `[ReactBlocAdapter] Re-rendering ${subscription.id} due to dependency change`,
            );
          }
        }
      } else if (
        this.autoTrackingEnabled &&
        !subscription.selector &&
        subscription.trackedDependencies &&
        subscription.trackedDependencies.size === 0 &&
        this.previousSnapshot
      ) {
        // Auto-tracking enabled but dependencies were tracked and found to be empty
        // Don't notify - component doesn't use any state
        shouldNotify = false;
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[ReactBlocAdapter] Skipping ${subscription.id}: auto-tracking enabled and no dependencies found`,
          );
        }
      } else {
        // No selector, no auto-tracking, or first render - always notify
        shouldNotify = true;
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[ReactBlocAdapter] Always notifying ${subscription.id}: fallback case (first render or no auto-tracking)`,
          );
        }
      }

      if (shouldNotify) {
        subscription.lastNotifiedVersion = this.version;
        subscription.notify();
      }
    }
  }

  /**
   * Subscribe to state changes
   *
   * This method is designed to be used with useSyncExternalStore's subscribe callback.
   * It provides a stable subscription identity and proper cleanup.
   *
   * @param selector - Optional selector for fine-grained subscriptions
   * @param notify - Callback to trigger React re-render
   * @param compare - Optional custom comparison function
   * @param subscriptionId - Optional subscription ID for auto-tracking
   * @returns Unsubscribe function
   */
  subscribe<R = S>(
    selector: Selector<S, R> | undefined,
    notify: () => void,
    compare?: CompareFn<R>,
    subscriptionId?: string,
  ): () => void {
    // Use provided subscription ID or generate a new one
    const finalSubscriptionId =
      subscriptionId ||
      `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Create subscription record
    const subscription: AdapterSubscription<R> = {
      id: finalSubscriptionId,
      notify,
      selector: selector as Selector<any, R> | undefined,
      compare,
      lastResult: selector ? selector(this.snapshot.state) : undefined,
      lastNotifiedVersion: this.version,
      createdAt: Date.now(),
      refCount: 1,
      // Initialize tracking fields
      trackedDependencies: undefined,
      renderCount: 0,
      lastTrackedVersion: -1,
    };

    this.subscriptions.set(finalSubscriptionId, subscription);
    this.subscriberCount++;

    // Capture current generation
    const currentGeneration = this.generation;

    // Return unsubscribe function
    return () => {
      // Check if this unsubscribe is still valid
      if (currentGeneration !== this.generation) {
        // Adapter was reset/disposed, subscription already cleaned up
        return;
      }

      const sub = this.subscriptions.get(finalSubscriptionId);
      if (!sub) return;

      sub.refCount--;
      if (sub.refCount <= 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[ReactBlocAdapter] 🧹 Cleaning up subscription ${finalSubscriptionId}`,
          );
        }

        this.subscriptions.delete(finalSubscriptionId);

        // Clear pending tracked state when subscription is removed
        // This ensures clean state for potential future re-subscriptions (e.g., Strict Mode remount)
        this.pendingTrackedStates.delete(finalSubscriptionId);

        this.subscriberCount--;

        // If no more subscribers, schedule cleanup
        if (this.subscriberCount === 0) {
          this.scheduleCleanup();
        }
      }
    };
  }

  /**
   * Get current snapshot
   *
   * This method is designed to be used with useSyncExternalStore's getSnapshot callback.
   * Returns the cached snapshot for efficient access.
   *
   * CRITICAL: This method MUST return stable references for the same state/selector combination
   * to prevent infinite loops in React's useSyncExternalStore.
   *
   * HYBRID TRACKING: This method handles early getSnapshot calls (before subscribe) and
   * regular getSnapshot calls (after subscribe). Tracking starts here, completes in unsubscribe.
   *
   * @param selector - Optional selector to apply to snapshot
   * @param subscriptionId - Optional subscription ID for auto-tracking
   * @returns Current state or selector result
   */
  getSnapshot<R = S>(
    selector?: Selector<S, R>,
    subscriptionId?: string,
  ): R | S {
    // If selector provided, use selector path (auto-tracking disabled for this subscription)
    if (selector) {
      // Check if we have a cached result for this selector
      if (this.selectorCache.has(selector)) {
        return this.selectorCache.get(selector);
      }

      // Compute and cache the result
      const result = selector(this.snapshot.state);
      this.selectorCache.set(selector, result);
      return result;
    }

    // Auto-tracking path (no selector)
    if (this.autoTrackingEnabled && this.dependencyTracker && subscriptionId) {
      const subscription = this.subscriptions.get(subscriptionId);

      // Determine if we should start tracking
      let shouldStartTracking = false;

      if (subscription) {
        // Subscription exists - use normal re-track logic
        subscription.renderCount = (subscription.renderCount || 0) + 1;
        shouldStartTracking = this.shouldReTrack(subscription);

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[ReactBlocAdapter] getSnapshot for ${subscriptionId}: subscription exists`,
            {
              shouldReTrack: shouldStartTracking,
              hasDependencies: !!subscription.trackedDependencies,
              renderCount: subscription.renderCount,
            },
          );
        }
      } else {
        // No subscription yet (early getSnapshot call before subscribe)
        // This happens on first render and after Strict Mode remount
        shouldStartTracking = !this.pendingTrackedStates.has(subscriptionId);

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[ReactBlocAdapter] getSnapshot for ${subscriptionId}: NO subscription yet (early call)`,
            {
              willStartTracking: shouldStartTracking,
              hasPendingState: this.pendingTrackedStates.has(subscriptionId),
            },
          );
        }
      }

      // Start tracking if needed (not already pending)
      if (shouldStartTracking && !this.pendingTrackedStates.has(subscriptionId)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[ReactBlocAdapter] 🎬 Starting tracking for ${subscriptionId}`,
          );
        }

        this.dependencyTracker.startTracking();
        this.pendingTrackedStates.set(subscriptionId, true);
      }

      // Return tracked proxy
      return this.dependencyTracker.createTrackedProxy(
        this.snapshot.state,
        [],
        `${Math.random()}-${subscriptionId}`,
      ) as S;
    }

    // Fallback to regular state (no selector, no auto-tracking)
    return this.snapshot.state;
  }

  // NOTE: trackDependencies method removed - tracking now happens directly in getSnapshot
  // This is part of the hybrid solution for React Strict Mode compatibility

  /**
   * Check if a subscription should re-track dependencies
   * @param subscription - The subscription to check
   * @returns True if should re-track
   */
  private shouldReTrack(subscription: AdapterSubscription): boolean {
    // Always track on first render
    if (!subscription.trackedDependencies) {
      return true;
    }

    // Re-track periodically to catch conditional dependency changes
    // Every 10 renders or when version changed significantly
    return (
      subscription.renderCount! % 10 === 0 ||
      subscription.lastTrackedVersion !== this.version
    );
  }

  /**
   * Complete dependency tracking for a subscription
   * Should be called after render completes
   * @param subscriptionId - The subscription ID
   * @param force - Force completion even if no dependencies tracked (for cleanup)
   */
  completeDependencyTracking(subscriptionId: string, force = false): void {
    if (!this.autoTrackingEnabled || !this.dependencyTracker) {
      return;
    }

    // Check if this subscription has pending tracking
    if (!this.pendingTrackedStates.has(subscriptionId)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[ReactBlocAdapter] ⏭️  No pending tracking for ${subscriptionId}`,
        );
      }
      return;
    }

    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[ReactBlocAdapter] ⏭️  Subscription ${subscriptionId} not found, clearing pending state`,
        );
      }
      this.pendingTrackedStates.delete(subscriptionId);
      return;
    }

    // Check if tracking is actually active (has recorded any accesses)
    const isTrackingActive = this.dependencyTracker.isTracking();

    if (!isTrackingActive && !force) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[ReactBlocAdapter] ⏸️  Tracking not active yet for ${subscriptionId}, deferring completion`,
        );
      }
      return; // Don't complete yet, wait for actual state access
    }

    // Stop tracking and get dependencies
    const dependencies = this.dependencyTracker.stopTracking();

    // Only store dependencies if we actually tracked something
    // Empty dependencies mean tracking started but no property was accessed
    if (dependencies.size > 0) {
      subscription.trackedDependencies = dependencies;
      subscription.lastTrackedVersion = this.version;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[ReactBlocAdapter] ✅ Tracked dependencies for ${subscriptionId}:`,
          Array.from(dependencies),
          'Total deps:',
          dependencies.size,
        );
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[ReactBlocAdapter] ⚠️  No dependencies tracked for ${subscriptionId}`,
        );
      }
    }

    // Clear pending flag
    this.pendingTrackedStates.delete(subscriptionId);
  }

  /**
   * Check if auto-tracking is enabled
   * @returns True if auto-tracking is enabled
   */
  isAutoTrackingEnabled(): boolean {
    return this.autoTrackingEnabled;
  }

  /**
   * Get server snapshot (for SSR)
   *
   * Returns a deterministic snapshot for server-side rendering.
   * This ensures hydration without mismatches.
   *
   * @param selector - Optional selector to apply
   * @returns Server-safe state
   */
  getServerSnapshot<R = S>(selector?: Selector<S, R>): R | S {
    // For SSR, we return the current snapshot
    // In a more advanced implementation, this could serialize async states
    return this.getSnapshot(selector);
  }

  /**
   * Get current version number
   *
   * Useful for debugging and understanding when state changed.
   *
   * @returns Current version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get subscription count
   *
   * Useful for debugging and lifecycle management.
   *
   * @returns Number of active subscriptions
   */
  getSubscriberCount(): number {
    return this.subscriberCount;
  }

  /**
   * Schedule cleanup when no subscribers remain
   *
   * Uses generation counter pattern to prevent race conditions.
   *
   * @private
   */
  private scheduleCleanup(): void {
    // Increment generation to invalidate pending cleanups
    this.generation++;
    const cleanupGeneration = this.generation;

    // Schedule cleanup in next microtask
    queueMicrotask(() => {
      // Validate generation before executing
      if (this.generation !== cleanupGeneration) {
        // Another subscription was added or adapter was disposed
        return;
      }

      // Still no subscribers - perform cleanup
      if (this.subscriberCount === 0) {
        this.dispose();
      }
    });
  }

  /**
   * Dispose of the adapter
   *
   * Cleans up all subscriptions and releases resources.
   * Should be called when the adapter is no longer needed.
   */
  dispose(): void {
    // Increment generation to invalidate all cleanup callbacks
    this.generation++;

    // Unsubscribe from bloc
    if (this.blocSubscription) {
      this.blocSubscription();
      this.blocSubscription = null;
    }

    // Clear all subscriptions
    this.subscriptions.clear();
    this.subscriberCount = 0;

    // Clear selector cache
    this.selectorCache.clear();
  }

  /**
   * Get debug information
   *
   * Useful for DevTools and debugging.
   *
   * @returns Debug information object
   */
  getDebugInfo() {
    return {
      blocUid: this.bloc.uid,
      blocName: this.bloc._name,
      version: this.version,
      subscriberCount: this.subscriberCount,
      generation: this.generation,
      subscriptions: Array.from(this.subscriptions.values()).map((sub) => ({
        id: sub.id,
        hasSelector: !!sub.selector,
        lastNotifiedVersion: sub.lastNotifiedVersion,
        refCount: sub.refCount,
        age: Date.now() - sub.createdAt,
      })),
    };
  }
}
