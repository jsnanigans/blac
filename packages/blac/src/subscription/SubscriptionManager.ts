import { BlocBase } from '../BlocBase';
import { Blac } from '../Blac';
import { generateUUID } from '../utils/uuid';
import {
  Subscription,
  SubscriptionOptions,
  SubscriptionManagerStats,
  SubscriptionResult,
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
   * @returns Object containing subscription ID and unsubscribe function
   */
  subscribe(options: SubscriptionOptions<S>): SubscriptionResult {
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

    // Return object with ID and unsubscribe function
    return {
      id,
      unsubscribe: () => this.unsubscribe(id),
    };
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
          // V3: Pass bloc instance for getter value comparison
          shouldNotify = this.shouldNotifyForPaths(
            subscription.id,
            changedPaths,
            this.bloc,
          );
        } else {
          // No tracked dependencies
          // Observer subscriptions (basic subscribe()) always notify
          if (subscription.type === 'observer') {
            shouldNotify = true;
          } else {
            // For consumers:
            // - If dependencies were tracked but are empty (primitive values), ALWAYS notify
            // - If dependencies not tracked yet (undefined/null), notify on first render or if proxy disabled
            const hasEmptyDependencies =
              subscription.dependencies && subscription.dependencies.size === 0;
            const neverRendered = !subscription.metadata?.hasRendered;
            shouldNotify =
              hasEmptyDependencies ||
              neverRendered ||
              !Blac.config.proxyDependencyTracking;
          }
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
   * V3: Recursive comparison with full dot-notation paths
   *
   * Recursively compares old and new state to find all changed paths.
   * Returns full paths like "profile.address.city" instead of just "profile".
   * Leverages immutability for early exit optimization (reference equality).
   *
   * @param oldState - Previous state value
   * @param newState - New state value
   * @param path - Current path being compared (for recursion)
   * @returns Set of full paths that changed
   */
  private getChangedPaths(
    oldState: any,
    newState: any,
    path = '',
  ): Set<string> {
    const changedPaths = new Set<string>();

    // Optimization: Same reference = no changes (immutability ftw!)
    if (oldState === newState) {
      return changedPaths;
    }

    // Handle non-object types (primitives, null, undefined)
    const isOldObject = typeof oldState === 'object' && oldState !== null;
    const isNewObject = typeof newState === 'object' && newState !== null;

    if (!isOldObject || !isNewObject) {
      // Primitive change or one side is null/undefined
      changedPaths.add(path || '*');
      return changedPaths;
    }

    // Both are objects - compare all keys
    const allKeys = new Set([
      ...Object.keys(oldState),
      ...Object.keys(newState),
    ]);

    for (const key of allKeys) {
      const oldValue = oldState[key];
      const newValue = newState[key];
      const fullPath = path ? `${path}.${key}` : key;

      // Optimization: Same reference = no change, skip recursion
      if (oldValue === newValue) {
        continue;
      }

      // Values differ - determine if we should recurse
      const isOldValueObject =
        typeof oldValue === 'object' && oldValue !== null;
      const isNewValueObject =
        typeof newValue === 'object' && newValue !== null;

      if (isOldValueObject && isNewValueObject) {
        // Both are objects - recurse to find nested changes
        const nestedChanges = this.getChangedPaths(oldValue, newValue, fullPath);

        // If there are nested changes, also mark the parent path as changed
        // This ensures that tracking "values" will catch changes to "values.0"
        // and that tracking "values.join" or "values.length" will match "values"
        if (nestedChanges.size > 0) {
          changedPaths.add(fullPath);
          for (const nestedPath of nestedChanges) {
            changedPaths.add(nestedPath);
          }
        }
      } else {
        // Primitive change or structural change (object <-> primitive)
        changedPaths.add(fullPath);
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
   * V3: Deep path tracking with parent-child relationship matching
   */
  shouldNotifyForPaths(
    subscriptionId: string,
    changedPaths: Set<string>,
    bloc?: any,
  ): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    // If no dependencies tracked (primitive values, first render), always notify
    if (!subscription || !subscription.dependencies || subscription.dependencies.size === 0) {
      return true;
    }

    // Handle '*' special case - entire state changed
    if (changedPaths.has('*')) return true;

    // Check if any tracked dependencies match changed paths
    for (const trackedPath of subscription.dependencies) {
      // Handle class getter dependencies (_class.propertyName)
      // Use value-based getter comparison
      if (trackedPath.startsWith('_class.')) {
        if (bloc && this.checkGetterChanged(subscriptionId, trackedPath, bloc)) {
          return true;
        }
        continue;
      }

      // V3: Check for exact match or parent-child path relationships

      // 1. Exact match: trackedPath === changedPath
      if (changedPaths.has(trackedPath)) return true;

      // 2. Check if any changed path is a child of this tracked path
      // Example: trackedPath="values" should match changedPath="values.0"
      for (const changedPath of changedPaths) {
        if (changedPath.startsWith(trackedPath + '.')) {
          return true;
        }
      }

      // 3. Check if tracked path is a child of any changed path
      // Example: trackedPath="values.0.name" should match changedPath="values.0"
      // But NOT if there's a sibling: tracked="user.profile.city" changed="user" when "user.age" also changed
      // Strategy: Find the MOST SPECIFIC parent (longest matching path) to avoid false positives from distant ancestors

      // First, find all leaf changed paths (paths with no children in the changed set)
      const leafChangedPaths = new Set<string>();
      for (const path of changedPaths) {
        let hasChild = false;
        for (const other of changedPaths) {
          if (other !== path && other.startsWith(path + '.')) {
            hasChild = true;
            break;
          }
        }
        if (!hasChild) {
          leafChangedPaths.add(path);
        }
      }

      // Check if any leaf changed path is a sibling of the tracked path
      for (const leafPath of leafChangedPaths) {
        // Check if they share a common parent
        const leafSegments = leafPath.split('.');
        const trackedSegments = trackedPath.split('.');

        // Find common ancestor length
        let commonLength = 0;
        while (
          commonLength < leafSegments.length &&
          commonLength < trackedSegments.length &&
          leafSegments[commonLength] === trackedSegments[commonLength]
        ) {
          commonLength++;
        }

        // If they have a common ancestor and diverge at some point, they're siblings
        if (commonLength > 0 && commonLength < leafSegments.length && commonLength < trackedSegments.length) {
          // They diverge at commonLength - this means they're siblings at that level
          // Don't notify
          continue;
        }

        // If the leaf is a parent of the tracked path, notify
        if (trackedPath.startsWith(leafPath + '.')) {
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
