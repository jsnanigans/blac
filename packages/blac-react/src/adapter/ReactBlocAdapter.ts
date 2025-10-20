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

  /** Subscription to bloc's state changes */
  private blocSubscription: (() => void) | null = null;

  /** Total number of components subscribed */
  private subscriberCount = 0;

  /** Generation counter for managing cleanup (similar to disposal pattern) */
  private generation = 0;

  /**
   * Create a new adapter for a Bloc
   *
   * @param bloc - The Bloc instance to adapt
   */
  constructor(bloc: BlocBase<S>) {
    this.bloc = bloc;

    // Create initial snapshot
    this.snapshot = {
      state: bloc.state,
      version: this.version,
      timestamp: Date.now(),
    };

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
        // State changed - increment version and update snapshot
        this.version++;
        this.snapshot = {
          state: this.bloc.state,
          version: this.version,
          timestamp: Date.now(),
        };

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
   * This is where the efficiency of the adapter pattern shines.
   *
   * @private
   */
  private notifySubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      // Skip if already notified for this version
      if (subscription.lastNotifiedVersion === this.version) {
        continue;
      }

      let shouldNotify = false;

      if (subscription.selector) {
        // Evaluate selector with new state
        const result = subscription.selector(this.snapshot.state);

        // Compare with last result
        const compare = subscription.compare || shallowEqual;
        const hasChanged = !compare(subscription.lastResult, result);

        if (hasChanged) {
          subscription.lastResult = result;
          shouldNotify = true;
        }
      } else {
        // No selector - always notify (will rely on proxy tracking or full state comparison)
        shouldNotify = true;
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
   * @returns Unsubscribe function
   */
  subscribe<R = S>(
    selector: Selector<S, R> | undefined,
    notify: () => void,
    compare?: CompareFn<R>
  ): () => void {
    // Generate unique subscription ID
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Create subscription record
    const subscription: AdapterSubscription<R> = {
      id: subscriptionId,
      notify,
      selector: selector as Selector<any, R> | undefined,
      compare,
      lastResult: selector ? selector(this.snapshot.state) : undefined,
      lastNotifiedVersion: this.version,
      createdAt: Date.now(),
      refCount: 1,
    };

    this.subscriptions.set(subscriptionId, subscription);
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

      const sub = this.subscriptions.get(subscriptionId);
      if (!sub) return;

      sub.refCount--;
      if (sub.refCount <= 0) {
        this.subscriptions.delete(subscriptionId);
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
   * @param selector - Optional selector to apply to snapshot
   * @returns Current state or selector result
   */
  getSnapshot<R = S>(selector?: Selector<S, R>): R | S {
    if (selector) {
      return selector(this.snapshot.state);
    }
    return this.snapshot.state;
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
      subscriptions: Array.from(this.subscriptions.values()).map(sub => ({
        id: sub.id,
        hasSelector: !!sub.selector,
        lastNotifiedVersion: sub.lastNotifiedVersion,
        refCount: sub.refCount,
        age: Date.now() - sub.createdAt,
      })),
    };
  }
}
