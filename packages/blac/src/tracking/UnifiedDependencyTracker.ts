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
 * Unified Dependency Tracker
 *
 * Manages all subscriptions and dependency tracking for the entire application.
 * Singleton pattern ensures consistent state across all blocs and components.
 */
export class UnifiedDependencyTracker {
  private static instance: UnifiedDependencyTracker;

  /** All active subscriptions, keyed by subscription ID */
  private subscriptions = new Map<string, SubscriptionState>();

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
  createSubscription(
    id: string,
    blocUid: string,
    notify: () => void,
  ): void {
    if (this.subscriptions.has(id)) {
      Blac.warn(`Subscription ${id} already exists, skipping creation`);
      return;
    }

    const subscription: SubscriptionState = {
      id,
      blocId: blocUid, // Store the uid for bloc lookup
      dependencies: [],
      valueCache: new Map(),
      notify,
      metadata: {
        mountTime: Date.now(),
        renderCount: 0,
      },
    };

    this.subscriptions.set(id, subscription);

    Blac.log(`[UnifiedTracker] Created subscription ${id} for bloc ${blocUid}`);
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

    // Clear value cache to free memory
    subscription.valueCache.clear();

    // Remove from subscriptions map
    this.subscriptions.delete(id);

    Blac.log(`[UnifiedTracker] Removed subscription ${id}`);
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
   *
   * @param subscriptionId - Which subscription is tracking this dependency
   * @param dependency - What dependency to track
   */
  track(subscriptionId: string, dependency: Dependency): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      Blac.warn(`Subscription ${subscriptionId} not found, cannot track`);
      return;
    }

    // Get dependency key for cache lookup
    const depKey = this.getDependencyKey(dependency);

    // Idempotency check: if already tracked, skip
    // This handles React Strict Mode double-render gracefully
    const alreadyTracked = subscription.dependencies.some(
      d => this.getDependencyKey(d) === depKey
    );

    if (alreadyTracked) {
      // Already tracking this dependency, no need to add again
      return;
    }

    // Add to dependency list
    subscription.dependencies.push(dependency);

    // CRITICAL: Immediately capture current value
    // This is synchronous - no async boundary, no timing bugs
    const bloc = Blac.getBlocByUid(subscription.blocId);
    if (!bloc) {
      Blac.error(`Bloc with uid ${subscription.blocId} not found for subscription ${subscriptionId}`);
      return;
    }

    const currentValue = this.evaluate(dependency, bloc);
    subscription.valueCache.set(depKey, currentValue);

    Blac.log(`[UnifiedTracker] Tracked ${depKey} for subscription ${subscriptionId}`);
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

    // Find all subscriptions for this bloc
    for (const [subId, sub] of this.subscriptions) {
      if (sub.blocId !== blocId) {
        continue; // Skip subscriptions for other blocs
      }

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

        // Value comparison (works for primitives, objects, functions, etc.)
        if (!Object.is(oldValue, newValue)) {
          // Value changed - update cache
          sub.valueCache.set(depKey, newValue);
          shouldNotify = true;

          Blac.log(`[UnifiedTracker] Dependency ${depKey} changed for subscription ${subId}`);

          // Early exit - one changed dependency is enough
          break;
        }
      }

      if (shouldNotify) {
        affected.add(subId);

        // Trigger React re-render
        sub.notify();

        // Update metadata
        sub.metadata.renderCount++;
        sub.metadata.lastNotified = Date.now();

        this.totalNotifications++;

        Blac.log(`[UnifiedTracker] Notified subscription ${subId} (render #${sub.metadata.renderCount})`);
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
      Blac.error(`Error evaluating dependency ${this.getDependencyKey(dep)}:`, error);
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
      subscriptions: Array.from(this.subscriptions.values()).map(sub => ({
        id: sub.id,
        blocId: sub.blocId,
        dependencyCount: sub.dependencies.length,
        renderCount: sub.metadata.renderCount,
        componentName: sub.metadata.componentName,
      })),
    };
  }
}
