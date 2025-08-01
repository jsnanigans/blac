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

    this.subscriptions.set(id, subscription);

    Blac.log(
      `[${this.bloc._name}:${this.bloc._id}] Subscription added: ${id}. Total: ${this.subscriptions.size}`,
    );

    // Return unsubscribe function
    return () => this.unsubscribe(id);
  }

  /**
   * Unsubscribe by ID
   */
  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

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

    this.subscriptions.delete(id);

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
    // Clean up dead weak references if needed
    this.cleanupDeadReferences();

    // Sort subscriptions by priority (descending)
    const sortedSubscriptions = Array.from(this.subscriptions.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );

    for (const subscription of sortedSubscriptions) {
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
        // No selector, always notify with full state
        shouldNotify = true;
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
  trackAccess(subscriptionId: string, path: string, value?: unknown): void {
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
   * Check if a subscription should be notified based on changed paths
   */
  shouldNotifyForPaths(
    subscriptionId: string,
    changedPaths: Set<string>,
  ): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.dependencies) return true;

    // Check direct path matches
    for (const changedPath of changedPaths) {
      if (subscription.dependencies.has(changedPath)) return true;

      // Check nested paths
      for (const trackedPath of subscription.dependencies) {
        if (
          changedPath.startsWith(trackedPath + '.') ||
          trackedPath.startsWith(changedPath + '.')
        ) {
          return true;
        }
      }
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
