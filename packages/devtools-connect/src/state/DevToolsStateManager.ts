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
  GetterInfo,
} from '../types';

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
    getters?: Record<string, GetterInfo>;
    createdFrom?: string;
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
          ...(instance.getters ? { getters: instance.getters } : {}),
        },
      ],
      createdAt: instance.createdAt,
      ...(instance.getters ? { getters: instance.getters } : {}),
      ...(instance.createdFrom ? { createdFrom: instance.createdFrom } : {}),
    };

    const isNew = !this.instances.has(instance.id);
    this.instances.set(instance.id, instanceState);
    if (isNew) {
      this.insertionOrder.push(instance.id);
    }
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
    getters?: Record<string, GetterInfo>,
    paths?: string[] | 'all',
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      console.warn(
        `[DevToolsStateManager] Cannot update state for unknown instance: ${instanceId}`,
      );
      return;
    }

    // Update current state and getters
    instance.currentState = currentState;
    if (getters) {
      instance.getters = getters;
    }

    // Add snapshot to history (circular buffer)
    const snapshot: StateSnapshot = {
      state: currentState,
      previousState,
      timestamp: Date.now(),
      callstack,
      trigger,
      ...(getters ? { getters } : {}),
      ...(paths !== undefined ? { paths } : {}),
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
   * Clear all tracked instances.
   * Useful for testing or resetting state.
   */
  clear(): void {
    this.instances.clear();
    this.insertionOrder = [];
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
