import { Cubit, blac } from '@blac/core';
import type { InstanceData, RefHolderInfo } from '../types';
import { debug } from '../utils/debug';

/** Maximum timestamps kept per instance in the update-rate ring buffer. */
const UPDATE_RING_MAX = 200;
/** Rolling window used to compute update rate (milliseconds). */
const UPDATE_RATE_WINDOW_MS = 10_000;

type InstancesState = {
  instances: InstanceData[];
  connected: boolean;
  // Track animation triggers: instanceId -> array of timestamps
  animationTriggers: Map<string, number[]>;
  // Ring buffer of state-change timestamps per instance (for update-rate insight)
  updateTimestamps: Map<string, number[]>;
};

/**
 * Manages the list of BlaC instances and connection status
 * Handles instance CRUD operations and visual animations
 */
@blac({ excludeFromDevTools: true })
export class DevToolsInstancesBloc extends Cubit<InstancesState> {
  constructor() {
    super({
      instances: [],
      connected: false,
      animationTriggers: new Map(),
      updateTimestamps: new Map(),
    });
  }

  // ============================================================================
  // Instance Management
  // ============================================================================

  /**
   * Add a new instance to the list
   */
  addInstance = (instance: InstanceData) => {
    debug.log(`addInstance: ${instance.className}#${instance.id}`);

    // Check if instance already exists
    const existing = this.state.instances.find((i) => i.id === instance.id);
    if (existing) {
      debug.warn(`Instance already exists, updating instead: ${instance.id}`);
      this.updateInstance(instance.id, instance);
      return;
    }

    const instances = [...this.state.instances, instance];
    this.patch({ instances });
    debug.log(`Instance added (total: ${instances.length})`);
  };

  /**
   * Remove an instance from the list
   */
  removeInstance = (instanceId: string) => {
    debug.log(`removeInstance: ${instanceId}`);

    const instances = this.state.instances.filter((i) => i.id !== instanceId);

    // Clean up animation triggers and update-rate ring buffer
    const animationTriggers = new Map(this.state.animationTriggers);
    animationTriggers.delete(instanceId);

    const updateTimestamps = new Map(this.state.updateTimestamps);
    updateTimestamps.delete(instanceId);

    this.patch({ instances, animationTriggers, updateTimestamps });
    debug.log(`Instance removed (total: ${instances.length})`);
  };

  /**
   * Update an existing instance (used when duplicate is added)
   */
  updateInstance = (instanceId: string, updates: Partial<InstanceData>) => {
    debug.log(`updateInstance: ${instanceId}`);

    const instances = this.state.instances.map((inst) => {
      if (inst.id === instanceId) {
        return { ...inst, ...updates };
      }
      return inst;
    });

    this.patch({ instances });
  };

  /**
   * Update state of an existing instance
   */
  updateInstanceState = (
    instanceId: string,
    currentState: any,
    getters?: InstanceData['getters'],
  ) => {
    debug.log(`updateInstanceState: ${instanceId}`);

    const instances = this.state.instances.map((inst) => {
      if (inst.id === instanceId) {
        return {
          ...inst,
          state: currentState,
          lastStateChangeTimestamp: Date.now(),
          ...(getters !== undefined ? { getters } : {}),
        };
      }
      return inst;
    });

    // Add animation trigger
    const animationTriggers = new Map(this.state.animationTriggers);
    const triggers = animationTriggers.get(instanceId) || [];
    const now = Date.now();

    // Keep only recent triggers (within 500ms) to prevent memory leak
    const recentTriggers = triggers.filter((t) => now - t < 500);
    recentTriggers.push(now);
    animationTriggers.set(instanceId, recentTriggers);

    // Record timestamp in update-rate ring buffer; prune old + cap size
    const updateTimestamps = new Map(this.state.updateTimestamps);
    const prevTs = updateTimestamps.get(instanceId) ?? [];
    const windowStart = now - UPDATE_RATE_WINDOW_MS;
    let nextTs = prevTs.filter((t) => t >= windowStart);
    nextTs.push(now);
    if (nextTs.length > UPDATE_RING_MAX) {
      nextTs = nextTs.slice(nextTs.length - UPDATE_RING_MAX);
    }
    updateTimestamps.set(instanceId, nextTs);

    this.patch({ instances, animationTriggers, updateTimestamps });
    debug.log(`Instance state updated: ${instanceId}`);
  };

  /**
   * Update ref IDs / ref holders for an instance (R:n tracking)
   */
  updateRefs = (
    instanceId: string,
    refIds?: string[],
    refHolders?: RefHolderInfo[],
  ) => {
    const instances = this.state.instances.map((inst) => {
      if (inst.id === instanceId) {
        return {
          ...inst,
          ...(refIds !== undefined ? { refIds } : {}),
          ...(refHolders !== undefined ? { refHolders } : {}),
        };
      }
      return inst;
    });
    this.patch({ instances });
  };

  /**
   * Set all instances at once (used only for initial load)
   */
  setAllInstances = (instances: InstanceData[]) => {
    debug.log(`setAllInstances: ${instances.length} instances`);
    this.patch({ instances: instances.slice() });
  };

  /**
   * Set connection status
   */
  setConnected = (connected: boolean) => {
    debug.log(`Connection status: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    this.patch({ connected });
  };

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get instance by ID
   */
  getInstance = (instanceId: string): InstanceData | null => {
    return this.state.instances.find((inst) => inst.id === instanceId) || null;
  };

  /**
   * Returns the number of state-changed events for an instance in the last 10 s.
   * Reads from the in-memory ring buffer; pruning is done on write, so this is O(1).
   */
  getUpdatesIn10s = (instanceId: string): number => {
    return this.state.updateTimestamps.get(instanceId)?.length ?? 0;
  };

  /**
   * Get all instances sorted by creation time
   */
  get sortedInstances(): InstanceData[] {
    return [...this.state.instances].sort((a, b) => a.createdAt - b.createdAt);
  }
}
