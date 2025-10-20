import { BlocBase } from '../BlocBase';
import { Blac } from '../Blac';
import { generateUUID } from '../utils/uuid';
import { PathIndex } from '../utils/PathIndex';
import {
  Subscription,
  SubscriptionOptions,
  SubscriptionManagerStats,
  SubscriptionResult,
} from './types';
import { logger } from '../logging';

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

  // Performance optimization: PathIndex for O(1) path relationship queries
  private pathIndex = new PathIndex();

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

    // Log subscription addition
    logger.log({
      level: 'log',
      topic: 'subscriptions',
      message: 'Observer subscribed',
      namespace: this.bloc._name,
      blocId: String(this.bloc._id),
      blocUid: this.bloc.uid,
      context: {
        subscriptionId: id,
        type: options.type,
        hasSelector: !!options.selector,
        hasPriority: subscription.priority !== 0,
        totalSubscriptions: this.subscriptions.size,
      },
    });

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

    // Log subscription removal
    logger.log({
      level: 'log',
      topic: 'subscriptions',
      message: 'Observer unsubscribed',
      namespace: this.bloc._name,
      blocId: String(this.bloc._id),
      blocUid: this.bloc.uid,
      context: {
        subscriptionId: id,
        remainingSubscriptions: this.subscriptions.size,
      },
    });

    // Check if bloc should be disposed
    this.bloc.checkDisposal();
  }

  /**
   * Notify all subscriptions of state change
   */
  notify(newState: S, oldState: S, action?: unknown): void {
    const startTime = performance.now();
    let notifiedCount = 0;
    let skippedCount = 0;

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
          notifiedCount++;

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
      } else {
        skippedCount++;
      }
    }

    const duration = performance.now() - startTime;

    // Log notification cycle summary
    logger.log({
      level: 'log',
      topic: 'subscriptions',
      message: 'Notification cycle completed',
      namespace: this.bloc._name,
      blocId: String(this.bloc._id),
      blocUid: this.bloc.uid,
      context: {
        notifiedCount,
        skippedCount,
        totalSubscriptions: this.subscriptions.size,
        duration: `${duration.toFixed(2)}ms`,
        action,
      },
    });
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

    // Compare with cached value/error (or treat as "no change" if no cache)
    let hasChanged = false;

    if (!cachedEntry) {
      // First access - cache the result and return false (no change)
      // We return false because we can't determine if it changed without a previous value
      // This prevents unnecessary re-renders when the cache is empty
      subscription.getterCache.set(getterPath, {
        value: newValue,
        error: newError,
      });
      return false;
    }

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
   * Invalidate getter cache entries when state paths change
   *
   * Fix #8: Clear getter cache to prevent memory leaks and stale values.
   *
   * When state paths change, we need to clear the getter cache because:
   * 1. Getters may depend on those state paths
   * 2. Cached getter values would be stale
   * 3. Keeping stale cache entries leads to memory leaks
   *
   * We only clear when STATE paths change, not when only GETTER paths change.
   *
   * @param subscriptionId The subscription whose getter cache to invalidate
   * @param changedPaths Set of paths that changed in the state
   */
  private invalidateGetterCache(
    subscriptionId: string,
    changedPaths: Set<string>,
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.getterCache) {
      return;
    }

    // Check if any changed paths are state paths (not getter paths starting with '_class.')
    let hasStatePath = false;
    for (const path of changedPaths) {
      if (!path.startsWith('_class.')) {
        hasStatePath = true;
        break;
      }
    }

    // Only clear cache if state paths changed (not just getter paths)
    if (hasStatePath) {
      subscription.getterCache.clear();
    }
  }

  /**
   * Check if a subscription should be notified based on changed paths
   * V3: Deep path tracking with parent-child relationship matching
   * V4: Invalidates getter cache when state paths change (Fix #8)
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

    // Note: We DON'T invalidate the getter cache here anymore.
    // The checkGetterChanged method already re-executes getters and compares values,
    // so clearing the cache would only cause false positives (triggering re-renders
    // when getter values haven't actually changed).
    // The cache is only used to store the previous value for comparison.
    // See: packages/blac-react/src/__tests__/dependency-tracking.advanced.test.tsx

    // Performance: Build PathIndex once for all paths
    // This enables O(1) parent-child lookups instead of O(n×m) string operations
    this.pathIndex.build(new Set([...subscription.dependencies, ...changedPaths]));

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
      // Performance: Use PathIndex for O(1) lookups
      for (const changedPath of changedPaths) {
        if (this.pathIndex.isChildOf(changedPath, trackedPath)) {
          return true;
        }
      }

      // 3. Check if tracked path is a child of any changed path
      // Example: trackedPath="profile.address.city" should match changedPath="profile"
      // But NOT if a sibling actually changed: tracked="user.profile.city", changed=["user", "user.age"]
      // The presence of "user.age" indicates the actual change was in a sibling branch

      // First, check if there's any sibling change across ALL changed paths
      // This prevents the issue where hasSiblingChange gets reset for each parent path
      let hasSiblingChange = false;
      const trackedSegments = trackedPath.split('.');

      for (const otherPath of changedPaths) {
        const otherSegments = otherPath.split('.');

        // Find common ancestor length
        let commonLength = 0;
        while (
          commonLength < otherSegments.length &&
          commonLength < trackedSegments.length &&
          otherSegments[commonLength] === trackedSegments[commonLength]
        ) {
          commonLength++;
        }

        // If they share a common ancestor and both diverge, they're siblings
        if (commonLength > 0 &&
            commonLength < otherSegments.length &&
            commonLength < trackedSegments.length) {
          hasSiblingChange = true;
          break;
        }
      }

      // Now check if tracked is a child of any changed path
      // Only notify if it's a child AND there's no sibling change
      for (const changedPath of changedPaths) {
        if (this.pathIndex.isChildOf(trackedPath, changedPath)) {
          if (!hasSiblingChange) {
            return true;
          }
          // If there is a sibling change, don't notify for this changed path
          // but continue checking other changed paths
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
