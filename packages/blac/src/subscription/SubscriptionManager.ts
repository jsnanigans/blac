import { BlocBase } from '../BlocBase';
import { Blac } from '../Blac';
import { generateUUID } from '../utils/uuid';
import {
  Subscription,
  SubscriptionOptions,
  SubscriptionManagerStats,
} from './types';

/**
 * Unified subscription manager that replaces the dual consumer/observer system.
 * Handles all state change subscriptions with a single, consistent interface.
 */
export class SubscriptionManager<S = unknown> {
  private subscriptions = new Map<string, Subscription<S>>();
  private pathToSubscriptions = new Map<string, Set<string>>();
  private weakRefCleanupScheduled = false;
  private totalNotifications = 0;

  // Optimization fields for subscription sorting performance
  // Fast path flag: true when any subscription has non-zero priority
  private hasNonZeroPriorities = false;
  // Cached sorted array: null when invalid/needs re-sorting
  private cachedSortedSubscriptions: Subscription<S>[] | null = null;

  constructor(private bloc: BlocBase<S>) {}

  /**
   * Subscribe to state changes
   */
  subscribe(options: SubscriptionOptions<S>): () => void {
    const id = `${options.type}-${generateUUID()}`;

    const subscription: Subscription<S> = {
      id,
      type: options.type,
      selector: options.selector,
      equalityFn: options.equalityFn || Object.is,
      notify: options.notify,
      priority: options.priority ?? 0,
      weakRef: options.weakRef,
      dependencies: new Set(),
      metadata: {
        lastNotified: Date.now(),
        hasRendered: false,
        accessCount: 0,
        firstAccessTime: Date.now(),
      },
    };

    // Initialize selector value if provided
    if (subscription.selector) {
      try {
        subscription.lastValue = subscription.selector(
          this.bloc.state,
          this.bloc,
        );
      } catch (error) {
        Blac.error(`SubscriptionManager: Error in selector for ${id}:`, error);
      }
    }

    // Track if any subscription uses non-zero priority
    if (subscription.priority !== 0) {
      this.hasNonZeroPriorities = true;
    }

    this.subscriptions.set(id, subscription);

    // Invalidate cache on subscription add
    this.cachedSortedSubscriptions = null;

    Blac.log(
      `[${this.bloc._name}:${this.bloc._id}] Subscription added: ${id}. Total: ${this.subscriptions.size}`,
    );

    // Cancel disposal if bloc is in disposal_requested state
    (this.bloc as any)._cancelDisposalIfRequested();

    // Return unsubscribe function
    return () => this.unsubscribe(id);
  }

  /**
   * Unsubscribe by ID
   */
  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

    // Recalculate flag if removing a priority subscription
    if (subscription.priority !== 0) {
      this.hasNonZeroPriorities = Array.from(this.subscriptions.values()).some(
        (s) => s.id !== id && s.priority !== 0,
      );
    }

    // Remove from path dependencies
    if (subscription.dependencies) {
      for (const path of subscription.dependencies) {
        const subs = this.pathToSubscriptions.get(path);
        if (subs) {
          subs.delete(id);
          if (subs.size === 0) {
            this.pathToSubscriptions.delete(path);
          }
        }
      }
    }

    // V2: Clear getter cache to prevent memory leaks
    if (subscription.getterCache) {
      subscription.getterCache.clear();
    }

    this.subscriptions.delete(id);

    // Invalidate cache on subscription remove
    this.cachedSortedSubscriptions = null;

    Blac.log(
      `[${this.bloc._name}:${this.bloc._id}] Subscription removed: ${id}. Remaining: ${this.subscriptions.size}`,
    );

    // Check if bloc should be disposed
    this.bloc.checkDisposal();
  }

  /**
   * Notify all subscriptions of state change
   */
  notify(newState: S, oldState: S, action?: unknown): void {
    // Hybrid optimization - fast path or cached sorted array
    let subscriptions: Iterable<Subscription<S>>;

    if (!this.hasNonZeroPriorities) {
      // Fast path: No priorities, iterate Map directly (O(1))
      subscriptions = this.subscriptions.values();
    } else {
      // Slow path: Use cached sorted array (O(1) amortized)
      if (!this.cachedSortedSubscriptions) {
        // First notify after add/remove: sort and cache
        this.cachedSortedSubscriptions = Array.from(
          this.subscriptions.values(),
        ).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      }
      subscriptions = this.cachedSortedSubscriptions;
    }

    for (const subscription of subscriptions) {
      // Check if WeakRef is still alive
      if (subscription.weakRef && !subscription.weakRef.deref()) {
        this.scheduleWeakRefCleanup();
        continue;
      }

      let shouldNotify = false;
      let newValue: unknown;
      let oldValue: unknown;

      if (subscription.selector) {
        // Use selector to determine if notification is needed
        try {
          newValue = subscription.selector(newState, this.bloc);
          oldValue = subscription.lastValue;

          const equalityFn = subscription.equalityFn || Object.is;
          shouldNotify = !equalityFn(oldValue, newValue);

          if (shouldNotify) {
            subscription.lastValue = newValue;
          }
        } catch (error) {
          Blac.error(
            `SubscriptionManager: Error in selector for ${subscription.id}:`,
            error,
          );
          continue;
        }
      } else {
        // No selector - check if tracked dependencies changed
        if (subscription.dependencies && subscription.dependencies.size > 0) {
          // Check which paths changed between old and new state
          const changedPaths = this.getChangedPaths(oldState, newState);
          // V2: Pass bloc instance for getter value comparison
          shouldNotify = this.shouldNotifyForPaths(
            subscription.id,
            changedPaths,
            this.bloc,
          );
          if ((Blac.config as any).logLevel === 'debug') {
            Blac.log(
              `[SubscriptionManager] Subscription ${subscription.id} dependencies:`,
              Array.from(subscription.dependencies),
            );
            Blac.log(
              `[SubscriptionManager] Changed paths:`,
              Array.from(changedPaths),
            );
            Blac.log(`[SubscriptionManager] Should notify:`, shouldNotify);
          }
        } else {
          // No tracked dependencies, always notify
          shouldNotify = true;
        }
        newValue = newState;
        oldValue = oldState;
      }

      if (shouldNotify) {
        try {
          subscription.notify(newValue, oldValue, action);
          this.totalNotifications++;

          if (subscription.metadata) {
            subscription.metadata.lastNotified = Date.now();
            subscription.metadata.hasRendered = true;
          }
        } catch (error) {
          Blac.error(
            `SubscriptionManager: Error in notify for ${subscription.id}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Track a path access for a subscription
   */
  trackAccess(subscriptionId: string, path: string, _value?: unknown): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Update dependencies
    if (!subscription.dependencies) {
      subscription.dependencies = new Set();
    }
    subscription.dependencies.add(path);

    // Update path-to-subscription mapping
    let subs = this.pathToSubscriptions.get(path);
    if (!subs) {
      subs = new Set();
      this.pathToSubscriptions.set(path, subs);
    }
    subs.add(subscriptionId);

    // Update metadata
    if (subscription.metadata) {
      subscription.metadata.accessCount =
        (subscription.metadata.accessCount || 0) + 1;
      subscription.metadata.lastAccessTime = Date.now();
    }
  }

  /**
   * Get the paths that changed between two states
   * V2: Top-level tracking only - no recursive comparison
   */
  private getChangedPaths(
    oldState: any,
    newState: any,
    _path = '', // Ignored in v2 - kept for API compatibility
  ): Set<string> {
    const changedPaths = new Set<string>();

    // If states are identical, no changes
    if (oldState === newState) return changedPaths;

    // If entire state changed (primitive or null), use '*' to indicate all dependencies should update
    if (
      typeof oldState !== 'object' ||
      typeof newState !== 'object' ||
      oldState === null ||
      newState === null
    ) {
      changedPaths.add('*');
      return changedPaths;
    }

    // V2: Only compare top-level properties using reference equality
    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldState),
      ...Object.keys(newState),
    ]);

    // Check each top-level property
    for (const key of allKeys) {
      const oldValue = oldState[key];
      const newValue = newState[key];

      // Reference inequality means the property changed
      // This includes:
      // - Primitive value changes
      // - Object/array reference changes (even if nested content changed)
      // - Added/removed properties (undefined !== value)
      if (oldValue !== newValue) {
        changedPaths.add(key);
      }
    }

    return changedPaths;
  }

  /**
   * Check if a getter value has changed
   * V2: Value-based getter change detection
   */
  private checkGetterChanged(
    subscriptionId: string,
    getterPath: string,
    bloc: any,
  ): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    // Initialize getter cache if not present
    if (!subscription.getterCache) {
      subscription.getterCache = new Map();
    }

    // Extract getter name from path (_class.getterName -> getterName)
    const getterName = getterPath.startsWith('_class.')
      ? getterPath.substring(7)
      : getterPath;

    const cachedEntry = subscription.getterCache.get(getterPath);

    // Execute getter and get new value/error
    let newValue: unknown;
    let newError: Error | undefined;

    try {
      newValue = bloc[getterName];
    } catch (error) {
      newError = error instanceof Error ? error : new Error(String(error));
    }

    // First access - always return true and cache the result
    if (!cachedEntry) {
      subscription.getterCache.set(getterPath, {
        value: newValue,
        error: newError,
      });
      return true;
    }

    // Compare with cached value/error
    let hasChanged = false;

    // If error state changed
    if (!!cachedEntry.error !== !!newError) {
      hasChanged = true;
    }
    // If both have errors, compare error messages
    else if (cachedEntry.error && newError) {
      hasChanged = cachedEntry.error.message !== newError.message;
    }
    // If no errors, compare values using shallow equality
    else if (!cachedEntry.error && !newError) {
      hasChanged = cachedEntry.value !== newValue;
    }

    // Update cache if changed
    if (hasChanged) {
      subscription.getterCache.set(getterPath, {
        value: newValue,
        error: newError,
      });
    }

    return hasChanged;
  }

  /**
   * Check if a subscription should be notified based on changed paths
   * V2: Simplified for top-level tracking + value-based getter comparison
   */
  shouldNotifyForPaths(
    subscriptionId: string,
    changedPaths: Set<string>,
    bloc?: any,
  ): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.dependencies) return true;

    // Handle '*' special case - entire state changed
    if (changedPaths.has('*')) return true;

    // Check if any tracked dependencies match changed paths
    for (const trackedPath of subscription.dependencies) {
      // Handle class getter dependencies (_class.propertyName)
      // V2: Use value-based getter comparison instead of conservative approach
      if (trackedPath.startsWith('_class.')) {
        if (bloc && this.checkGetterChanged(subscriptionId, trackedPath, bloc)) {
          return true;
        }
        continue;
      }

      // V2: Direct top-level property matching only
      // No nested path matching since we only track top-level properties
      if (changedPaths.has(trackedPath)) return true;
    }

    return false;
  }

  /**
   * Get statistics about subscriptions
   */
  getStats(): SubscriptionManagerStats {
    let consumerCount = 0;
    let observerCount = 0;

    for (const sub of this.subscriptions.values()) {
      if (sub.type === 'consumer') consumerCount++;
      else observerCount++;
    }

    return {
      activeSubscriptions: this.subscriptions.size,
      consumerCount,
      observerCount,
      totalNotifications: this.totalNotifications,
      trackedDependencies: this.pathToSubscriptions.size,
    };
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.pathToSubscriptions.clear();
  }

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): Subscription<S> | undefined {
    return this.subscriptions.get(id);
  }

  /**
   * Check if there are any active subscriptions
   */
  get hasSubscriptions(): boolean {
    return this.subscriptions.size > 0;
  }

  /**
   * Get count of active subscriptions
   */
  get size(): number {
    return this.subscriptions.size;
  }

  /**
   * Clean up subscriptions with dead weak references
   */
  private cleanupDeadReferences(): void {
    if (!this.weakRefCleanupScheduled) return;

    const deadIds: string[] = [];

    for (const [id, subscription] of this.subscriptions) {
      if (subscription.weakRef && !subscription.weakRef.deref()) {
        deadIds.push(id);
      }
    }

    for (const id of deadIds) {
      this.unsubscribe(id);
    }

    this.weakRefCleanupScheduled = false;
  }

  /**
   * Schedule weak reference cleanup for next tick
   */
  private scheduleWeakRefCleanup(): void {
    if (this.weakRefCleanupScheduled) return;

    this.weakRefCleanupScheduled = true;
    queueMicrotask(() => this.cleanupDeadReferences());
  }
}
