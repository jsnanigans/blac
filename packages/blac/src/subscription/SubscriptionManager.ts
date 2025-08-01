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
        // No selector - check if tracked dependencies changed
        if (subscription.dependencies && subscription.dependencies.size > 0) {
          // Check which paths changed between old and new state
          const changedPaths = this.getChangedPaths(oldState, newState);
          shouldNotify = this.shouldNotifyForPaths(
            subscription.id,
            changedPaths,
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
   * Get the paths that changed between two states
   */
  private getChangedPaths(
    oldState: any,
    newState: any,
    path = '',
  ): Set<string> {
    const changedPaths = new Set<string>();

    if (oldState === newState) return changedPaths;

    // Handle primitives
    if (
      typeof oldState !== 'object' ||
      typeof newState !== 'object' ||
      oldState === null ||
      newState === null
    ) {
      if (path) changedPaths.add(path);
      return changedPaths;
    }

    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldState),
      ...Object.keys(newState),
    ]);

    for (const key of allKeys) {
      const fullPath = path ? `${path}.${key}` : key;
      const oldValue = oldState[key];
      const newValue = newState[key];

      if (oldValue !== newValue) {
        changedPaths.add(fullPath);

        // For nested objects, get all nested changed paths
        if (
          typeof oldValue === 'object' &&
          typeof newValue === 'object' &&
          oldValue !== null &&
          newValue !== null
        ) {
          const nestedChanges = this.getChangedPaths(
            oldValue,
            newValue,
            fullPath,
          );
          nestedChanges.forEach((p) => changedPaths.add(p));
        }
      }
    }

    return changedPaths;
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

    // Check if any tracked dependencies match changed paths
    for (const trackedPath of subscription.dependencies) {
      // Handle class getter dependencies (_class.propertyName)
      if (trackedPath.startsWith('_class.')) {
        // For class getters, we need to notify on any state change
        // since we can't determine which state properties the getter depends on
        // This is conservative but ensures correctness
        if (changedPaths.size > 0) {
          return true;
        }
        continue;
      }

      // Check direct path matches
      if (changedPaths.has(trackedPath)) return true;

      // Check nested paths
      for (const changedPath of changedPaths) {
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
