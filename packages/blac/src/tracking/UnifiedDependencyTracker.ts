/**
 * Unified Dependency Tracking System
 *
 * This is the core of the Hybrid Unified System architecture.
 * It replaces the split responsibilities of BlacAdapter + SubscriptionManager
 * with a single, unified tracking mechanism for all dependency types.
 *
 * Key Design Principles:
 * 1. Single Source of Truth: All subscriptions managed in one place
 * 2. Synchronous Tracking: No async boundaries, no timing bugs
 * 3. Unified Paradigm: Same logic for state, getters, and custom deps
 * 4. Value Comparison: Always compare values, not paths
 *
 * @module tracking/UnifiedDependencyTracker
 */

import { Blac } from '../Blac';
import type { BlocBase } from '../BlocBase';
import type {
  Dependency,
  SubscriptionState,
  StateChange,
  StateDependency,
  ComputedDependency,
  CustomDependency,
} from './types';
import {
  isStateDependency,
  isComputedDependency,
  isCustomDependency,
} from './types';

/**
 * Render-specific tracking data
 */
interface RenderTracking {
  renderId: string;
  dependencies: Dependency[];
  timestamp: number;
  committed: boolean;
}

/**
 * Enhanced subscription state with render tracking
 */
interface EnhancedSubscriptionState extends SubscriptionState {
  renderTracking: Map<string, RenderTracking>;
  activeRenderId?: string;
  lastCommittedRenderId?: string;
}

/**
 * Unified Dependency Tracker
 *
 * Manages all subscriptions and dependency tracking for the entire application.
 * Singleton pattern ensures consistent state across all blocs and components.
 *
 * Enhanced with render-specific tracking to support React 18 concurrent features.
 */
export class UnifiedDependencyTracker {
  private static instance: UnifiedDependencyTracker;

  /** All active subscriptions, keyed by subscription ID */
  private subscriptions = new Map<string, EnhancedSubscriptionState>();

  /** Cleanup timeouts for abandoned renders */
  private cleanupTimeouts = new Map<string, NodeJS.Timeout>();

  /** Total notifications sent (for debugging/metrics) */
  private totalNotifications = 0;

  private constructor() {
    // Private constructor enforces singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): UnifiedDependencyTracker {
    if (!UnifiedDependencyTracker.instance) {
      UnifiedDependencyTracker.instance = new UnifiedDependencyTracker();
    }
    return UnifiedDependencyTracker.instance;
  }

  /**
   * Reset the singleton (for testing only)
   * @internal
   */
  static resetInstance(): void {
    // Clear all cleanup timeouts
    if (UnifiedDependencyTracker.instance) {
      UnifiedDependencyTracker.instance.cleanupTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
    }
    UnifiedDependencyTracker.instance = new UnifiedDependencyTracker();
  }

  /**
   * Create a new subscription
   *
   * Called when a component mounts and starts using a Bloc.
   * Creates the SubscriptionState that will track dependencies.
   *
   * @param id - Unique subscription identifier
   * @param blocUid - Unique ID (uid) of the Bloc being subscribed to
   * @param notify - Callback to trigger React re-render
   */
  createSubscription(id: string, blocUid: string, notify: () => void): void {
    if (this.subscriptions.has(id)) {
      // Update the notify callback if subscription exists
      const existing = this.subscriptions.get(id)!;
      existing.notify = notify;
      Blac.log(`[UnifiedTracker] Updated subscription ${id} callback`);
      return;
    }

    const subscription: EnhancedSubscriptionState = {
      id,
      blocId: blocUid, // Store the uid for bloc lookup
      dependencies: [],
      valueCache: new Map(),
      notify,
      renderTracking: new Map(),
      metadata: {
        mountTime: Date.now(),
        renderCount: 0,
      },
    };

    this.subscriptions.set(id, subscription);

    Blac.log(`[UnifiedTracker] Created subscription ${id} for bloc ${blocUid}`);
  }

  /**
   * Update the notify callback for a subscription
   *
   * Used to update the callback when useSyncExternalStore provides it.
   * This allows us to create the subscription early but update the callback later.
   *
   * @param id - Subscription identifier
   * @param notify - New notify callback
   */
  updateNotifyCallback(id: string, notify: () => void): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.notify = notify;
      Blac.log(`[UnifiedTracker] Updated notify callback for ${id}`);
    } else {
      Blac.warn(
        `[UnifiedTracker] Subscription ${id} not found when updating notify callback`,
      );
    }
  }

  /**
   * Update the bloc ID for a subscription
   *
   * Used when the bloc instance changes (e.g., isolated blocs in React Strict Mode).
   * This allows the subscription to track a different bloc instance.
   *
   * @param id - Subscription identifier
   * @param newBlocId - New bloc UID to track
   */
  updateSubscriptionBlocId(id: string, newBlocId: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      const oldBlocId = subscription.blocId;
      subscription.blocId = newBlocId;
      Blac.log(
        `[UnifiedTracker] Updated subscription ${id} bloc ID from ${oldBlocId} to ${newBlocId}`,
      );

      // Clear value cache as we're now tracking a different bloc
      subscription.valueCache.clear();
      // Clear dependencies to force re-tracking
      subscription.dependencies = [];
    } else {
      Blac.warn(
        `[UnifiedTracker] Subscription ${id} not found when updating bloc ID`,
      );
    }
  }

  /**
   * Remove a subscription
   *
   * Called when a component unmounts.
   * Cleans up all tracked dependencies and cached values.
   *
   * @param id - Subscription identifier to remove
   */
  removeSubscription(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      Blac.warn(`Subscription ${id} not found, skipping removal`);
      return;
    }

    // Clear all cleanup timeouts for this subscription
    subscription.renderTracking.forEach((_, renderId) => {
      const timeoutKey = `${id}-${renderId}`;
      const timeout = this.cleanupTimeouts.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        this.cleanupTimeouts.delete(timeoutKey);
      }
    });

    // Clear value cache and render tracking to free memory
    subscription.valueCache.clear();
    subscription.renderTracking.clear();

    // Remove from subscriptions map
    this.subscriptions.delete(id);

    Blac.log(`[UnifiedTracker] Removed subscription ${id}`);
  }

  /**
   * Start tracking for a specific render attempt
   *
   * Called at the start of each render to begin collecting new dependencies.
   * Each render gets a unique ID to isolate tracking and support concurrent renders.
   *
   * @param subscriptionId - Which subscription is rendering
   * @param renderContext - Stable context for this render (changes only for concurrent features)
   */
  startRenderTracking(subscriptionId: string, renderContext: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      Blac.warn(
        `Subscription ${subscriptionId} not found, cannot start tracking`,
      );
      return;
    }

    // Check if we already have tracking for this context
    let renderTracking = subscription.renderTracking.get(renderContext);

    if (!renderTracking) {
      // Create new tracking for this render context
      renderTracking = {
        renderId: renderContext,
        dependencies: [],
        timestamp: Date.now(),
        committed: false,
      };
      subscription.renderTracking.set(renderContext, renderTracking);

      // Schedule cleanup for abandoned renders (10 seconds timeout)
      // Only for new contexts, not re-renders in the same context
      const timeoutKey = `${subscriptionId}-${renderContext}`;
      this.cleanupTimeouts.set(
        timeoutKey,
        setTimeout(() => {
          this.cleanupAbandonedRender(subscriptionId, renderContext);
        }, 10000),
      );
    } else {
      // Reset dependencies for new tracking pass in same context
      renderTracking.dependencies = [];
      renderTracking.timestamp = Date.now();
    }

    subscription.activeRenderId = renderContext;

    Blac.log(
      `[UnifiedTracker] Started render tracking ${renderContext} for subscription ${subscriptionId}`,
    );
  }

  /**
   * Commit tracked dependencies from a specific render
   *
   * Called after render completes to atomically replace old dependencies
   * with the new ones tracked during this specific render.
   *
   * @param subscriptionId - Which subscription is committing
   * @param renderId - Unique identifier for the render being committed
   */
  commitRenderTracking(subscriptionId: string, renderId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      Blac.warn(
        `Subscription ${subscriptionId} not found, cannot commit tracking`,
      );
      return;
    }

    const renderTracking = subscription.renderTracking.get(renderId);
    if (!renderTracking) {
      Blac.warn(
        `Render ${renderId} not found for subscription ${subscriptionId}`,
      );
      return;
    }

    // Cancel cleanup timeout
    const timeoutKey = `${subscriptionId}-${renderId}`;
    const timeout = this.cleanupTimeouts.get(timeoutKey);
    if (timeout) {
      clearTimeout(timeout);
      this.cleanupTimeouts.delete(timeoutKey);
    }

    // Commit the dependencies from this render
    subscription.dependencies = renderTracking.dependencies;
    renderTracking.committed = true;
    subscription.lastCommittedRenderId = renderId;

    // Clean up old uncommitted renders (keep last 3 for debugging)
    const renders = Array.from(subscription.renderTracking.entries());
    const uncommitted = renders.filter(([_, r]) => !r.committed);
    if (uncommitted.length > 3) {
      uncommitted
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, -3)
        .forEach(([id]) => subscription.renderTracking.delete(id));
    }

    Blac.log(
      `[UnifiedTracker] Committed ${renderTracking.dependencies.length} dependencies from render ${renderId}`,
    );
  }

  /**
   * Track a dependency
   *
   * Called when a component accesses state/getter during render.
   * This is the core tracking mechanism - synchronous and immediate.
   *
   * Key behavior:
   * - Idempotent: tracking same dependency twice is safe (no-op)
   * - Synchronous: value is captured immediately, no async commit
   * - Works in React Strict Mode: duplicate tracking is ignored
   * - Always updates cache, even if dependency was already tracked
   * - Supports render-specific tracking for concurrent renders
   *
   * @param subscriptionId - Which subscription is tracking this dependency
   * @param dependency - What dependency to track
   * @param renderId - Optional render ID for render-specific tracking
   */
  track(
    subscriptionId: string,
    dependency: Dependency,
    renderId?: string,
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      Blac.warn(`Subscription ${subscriptionId} not found, cannot track`);
      return;
    }

    const depKey = this.getDependencyKey(dependency);

    // Use provided renderId or fall back to active render
    const targetRenderId = renderId || subscription.activeRenderId;

    if (targetRenderId && subscription.renderTracking.has(targetRenderId)) {
      // Render-specific tracking
      const renderTracking = subscription.renderTracking.get(targetRenderId)!;

      const alreadyTracked = renderTracking.dependencies.some(
        (d) => this.getDependencyKey(d) === depKey,
      );

      if (!alreadyTracked) {
        renderTracking.dependencies.push(dependency);
      }

      // Always update the value cache
      const bloc = Blac.getBlocByUid(subscription.blocId);
      if (bloc) {
        const currentValue = this.evaluate(dependency, bloc);
        subscription.valueCache.set(depKey, currentValue);
      }

      Blac.log(
        `[UnifiedTracker] Tracked ${depKey} for render ${targetRenderId}`,
      );
    } else {
      // Fallback to direct tracking (for custom dependencies or non-render tracking)
      const alreadyTracked = subscription.dependencies.some(
        (d) => this.getDependencyKey(d) === depKey,
      );

      if (!alreadyTracked) {
        subscription.dependencies.push(dependency);
      }

      // Update value cache
      const bloc = Blac.getBlocByUid(subscription.blocId);
      if (bloc) {
        const currentValue = this.evaluate(dependency, bloc);
        subscription.valueCache.set(depKey, currentValue);
      }

      Blac.log(
        `[UnifiedTracker] Tracked ${depKey} for subscription ${subscriptionId} (direct)`,
      );
    }
  }

  /**
   * Clean up an abandoned render that was never committed
   * @private
   */
  private cleanupAbandonedRender(
    subscriptionId: string,
    renderId: string,
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const renderTracking = subscription.renderTracking.get(renderId);
    if (renderTracking && !renderTracking.committed) {
      subscription.renderTracking.delete(renderId);
      Blac.log(`[UnifiedTracker] Cleaned up abandoned render ${renderId}`);
    }

    // Clean up timeout reference
    const timeoutKey = `${subscriptionId}-${renderId}`;
    this.cleanupTimeouts.delete(timeoutKey);
  }

  /**
   * Notify subscriptions of state changes
   *
   * Called by BlocBase.emit() when state changes.
   * Re-evaluates all dependencies and triggers re-renders if values changed.
   *
   * This is where the magic happens:
   * - Same logic for all dependency types (state, computed, custom)
   * - Value comparison only (Object.is)
   * - Synchronous execution
   *
   * @param blocId - ID of the Bloc whose state changed
   * @param change - Details of the state change
   * @returns Set of subscription IDs that were notified
   */
  notifyChanges(blocId: string, change: StateChange): Set<string> {
    const affected = new Set<string>();

    Blac.log(
      `[UnifiedTracker] notifyChanges called for bloc ${blocId}, checking ${this.subscriptions.size} subscriptions`,
    );

    // Find all subscriptions for this bloc
    for (const [subId, sub] of this.subscriptions) {
      if (sub.blocId !== blocId) {
        Blac.log(
          `[UnifiedTracker] Skipping subscription ${subId} (blocId: ${sub.blocId} !== ${blocId})`,
        );
        continue; // Skip subscriptions for other blocs
      }

      Blac.log(
        `[UnifiedTracker] Found matching subscription ${subId} for bloc ${blocId}, deps: ${sub.dependencies.length}`,
      );

      let shouldNotify = false;
      const bloc = Blac.getBlocByUid(blocId);
      if (!bloc) {
        Blac.error(`Bloc with uid ${blocId} not found during notification`);
        continue;
      }

      // Check each dependency for changes
      for (const dep of sub.dependencies) {
        const depKey = this.getDependencyKey(dep);
        const oldValue = sub.valueCache.get(depKey);

        // Re-evaluate the dependency with current state
        const newValue = this.evaluate(dep, bloc);

        // Value comparison - handle arrays specially for deep comparison
        let valueChanged = false;

        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
          // Compare array contents instead of reference
          if (oldValue.length !== newValue.length) {
            valueChanged = true;
          } else {
            for (let i = 0; i < oldValue.length; i++) {
              if (!Object.is(oldValue[i], newValue[i])) {
                valueChanged = true;
                break;
              }
            }
          }
        } else {
          // For non-arrays, use Object.is (works for primitives, objects, functions, etc.)
          valueChanged = !Object.is(oldValue, newValue);
        }

        if (valueChanged) {
          // Value changed - update cache
          sub.valueCache.set(depKey, newValue);
          shouldNotify = true;

          Blac.log(
            `[UnifiedTracker] Dependency ${depKey} changed for subscription ${subId}`,
          );

          // Early exit - one changed dependency is enough
          break;
        }
      }

      if (shouldNotify) {
        affected.add(subId);

        // Trigger React re-render
        Blac.log(
          `[UnifiedTracker] About to notify subscription ${subId}, notify is: ${typeof sub.notify}`,
        );
        sub.notify();

        // Update metadata
        sub.metadata.renderCount++;
        sub.metadata.lastNotified = Date.now();

        this.totalNotifications++;

        Blac.log(
          `[UnifiedTracker] Notified subscription ${subId} (render #${sub.metadata.renderCount})`,
        );
      }
    }

    return affected;
  }

  /**
   * Generate a unique key for a dependency
   *
   * Used for cache lookups and idempotency checks.
   * Format: "type:identifier"
   *
   * Examples:
   * - State: "state:count"
   * - Computed: "computed:doubled"
   * - Custom: "custom:manual-deps"
   */
  private getDependencyKey(dep: Dependency): string {
    switch (dep.type) {
      case 'state':
        return `state:${dep.path}`;
      case 'computed':
        return `computed:${dep.key}`;
      case 'custom':
        return `custom:${dep.key}`;
    }
  }

  /**
   * Evaluate a dependency to get its current value
   *
   * This is the unified evaluation logic - same for all dependency types.
   * Handles errors gracefully by logging and returning undefined.
   *
   * @param dep - Dependency to evaluate
   * @param bloc - Bloc instance to evaluate against
   * @returns Current value of the dependency
   */
  private evaluate(dep: Dependency, bloc: BlocBase<any>): any {
    try {
      if (isStateDependency(dep)) {
        return this.getNestedValue(bloc.state, dep.path);
      } else if (isComputedDependency(dep)) {
        return dep.compute();
      } else if (isCustomDependency(dep)) {
        return dep.selector(bloc);
      }
    } catch (error) {
      Blac.error(
        `Error evaluating dependency ${this.getDependencyKey(dep)}:`,
        error,
      );
      return undefined;
    }
  }

  /**
   * Get a nested value from an object using dot notation
   *
   * Example: getNestedValue({ user: { name: "John" } }, "user.name") => "John"
   *
   * @param obj - Object to traverse
   * @param path - Dot-notation path
   * @returns Value at path, or undefined if not found
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current == null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Get subscription by ID (for debugging)
   */
  getSubscription(id: string): SubscriptionState | undefined {
    return this.subscriptions.get(id);
  }

  /**
   * Get all subscriptions (for debugging)
   */
  getAllSubscriptions(): SubscriptionState[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get statistics (for debugging/monitoring)
   */
  getStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      totalNotifications: this.totalNotifications,
      subscriptions: Array.from(this.subscriptions.values()).map((sub) => ({
        id: sub.id,
        blocId: sub.blocId,
        dependencyCount: sub.dependencies.length,
        renderCount: sub.metadata.renderCount,
        activeRenders: sub.renderTracking.size,
        lastCommittedRenderId: sub.lastCommittedRenderId,
        componentName: sub.metadata.componentName,
      })),
    };
  }
}
