/**
 * DevTools State Manager
 *
 * Maintains complete state history for all tracked BlaC instances.
 * Acts as the "backend" that DevTools panels connect to for full state dumps.
 */

import type {
  StateSnapshot,
  InstanceState,
  DevToolsSnapshot,
  DevToolsStateManagerConfig,
  Trigger,
} from '../types';

// Re-export types for backward compatibility
export type {
  StateSnapshot,
  InstanceState,
  DevToolsSnapshot,
  DevToolsStateManagerConfig,
};

export interface StateManagerStats {
  /** Total number of tracked instances */
  totalInstances: number;
  /** Total number of snapshots across all instances */
  totalSnapshots: number;
  /** Estimated memory usage in bytes */
  estimatedMemory: number;
}

/**
 * Manages state for all BlaC instances tracked by DevTools.
 *
 * This class acts as the persistent backend that:
 * - Records all lifecycle events from app startup
 * - Maintains complete state history (last N snapshots per instance)
 * - Provides full state dumps to connecting DevTools panels
 * - Handles memory limits with FIFO eviction
 */
export class DevToolsStateManager {
  private instances = new Map<string, InstanceState>();
  private maxInstances: number;
  private maxSnapshots: number;

  // Track insertion order for FIFO eviction
  private insertionOrder: string[] = [];

  constructor(config: DevToolsStateManagerConfig = {}) {
    this.maxInstances = config.maxInstances ?? 2000;
    this.maxSnapshots = config.maxSnapshots ?? 20;
  }

  /**
   * Add a new instance to tracking.
   * Called when a bloc is created.
   */
  addInstance(instance: {
    id: string;
    className: string;
    name: string;
    state: any;
    createdAt: number;
  }): void {
    // Check if we need to evict oldest instance
    if (
      this.instances.size >= this.maxInstances &&
      !this.instances.has(instance.id)
    ) {
      this.evictOldestInstance();
    }

    const instanceState: InstanceState = {
      id: instance.id,
      className: instance.className,
      name: instance.name,
      currentState: instance.state,
      history: [
        {
          state: instance.state,
          previousState: null,
          timestamp: instance.createdAt,
        },
      ],
      createdAt: instance.createdAt,
    };

    this.instances.set(instance.id, instanceState);
    this.insertionOrder.push(instance.id);
  }

  /**
   * Update state for an existing instance.
   * Called when a bloc's state changes.
   */
  updateState(
    instanceId: string,
    previousState: any,
    currentState: any,
    callstack?: string,
    trigger?: Trigger,
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      console.warn(
        `[DevToolsStateManager] Cannot update state for unknown instance: ${instanceId}`,
      );
      return;
    }

    // Update current state
    instance.currentState = currentState;

    // Add snapshot to history (circular buffer)
    const snapshot: StateSnapshot = {
      state: currentState,
      previousState,
      timestamp: Date.now(),
      callstack,
      trigger,
    };

    instance.history.push(snapshot);

    // Maintain max snapshots limit (remove oldest if exceeded)
    if (instance.history.length > this.maxSnapshots) {
      instance.history.shift();
    }
  }

  /**
   * Remove an instance from tracking.
   * Called when a bloc is disposed.
   */
  removeInstance(instanceId: string): void {
    this.instances.delete(instanceId);

    // Remove from insertion order
    const index = this.insertionOrder.indexOf(instanceId);
    if (index !== -1) {
      this.insertionOrder.splice(index, 1);
    }
  }

  /**
   * Get full state dump for connecting DevTools panels.
   * This is sent when a panel connects (FULL_STATE_DUMP).
   */
  getFullState(): DevToolsSnapshot {
    return {
      instances: Array.from(this.instances.values()),
      timestamp: Date.now(),
    };
  }

  /**
   * Get a specific instance by ID.
   * Useful for debugging or panel queries.
   */
  getInstance(instanceId: string): InstanceState | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instance IDs.
   */
  getAllInstanceIds(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Clear all tracked instances.
   * Useful for testing or resetting state.
   */
  clear(): void {
    this.instances.clear();
    this.insertionOrder = [];
  }

  /**
   * Get statistics about tracked state.
   */
  getStats(): StateManagerStats {
    let totalSnapshots = 0;
    let estimatedMemory = 0;

    for (const instance of this.instances.values()) {
      totalSnapshots += instance.history.length;

      // Rough memory estimate (very approximate)
      // Each snapshot: ~5KB (state + previousState + metadata)
      // Instance metadata: ~500 bytes
      estimatedMemory += 500 + instance.history.length * 5000;
    }

    return {
      totalInstances: this.instances.size,
      totalSnapshots,
      estimatedMemory,
    };
  }

  /**
   * Evict oldest instance (FIFO) when maxInstances limit is reached.
   */
  private evictOldestInstance(): void {
    if (this.insertionOrder.length === 0) return;

    const oldestId = this.insertionOrder[0];
    this.removeInstance(oldestId);

    console.warn(
      `[DevToolsStateManager] Evicted oldest instance (max instances reached): ${oldestId}`,
    );
  }
}
