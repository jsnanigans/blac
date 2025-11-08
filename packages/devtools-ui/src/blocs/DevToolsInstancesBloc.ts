import { Cubit } from '@blac/core';
import type { InstanceData } from '../types';

type InstancesState = {
  instances: InstanceData[];
  connected: boolean;
  // Track animation triggers: instanceId -> array of timestamps
  animationTriggers: Map<string, number[]>;
};

/**
 * Manages the list of BlaC instances and connection status
 * Handles instance CRUD operations and visual animations
 */
export class DevToolsInstancesBloc extends Cubit<InstancesState> {
  /**
   * Exclude from DevTools to prevent infinite loop
   * (DevTools tracking itself)
   */
  static __excludeFromDevTools = true;

  constructor() {
    super({
      instances: [],
      connected: false,
      animationTriggers: new Map(),
    });
  }

  // ============================================================================
  // Instance Management
  // ============================================================================

  /**
   * Add a new instance to the list
   */
  addInstance = (instance: InstanceData) => {
    console.log(
      `[InstancesBloc] addInstance: ${instance.className}#${instance.id}`,
    );

    // Check if instance already exists
    const existing = this.state.instances.find((i) => i.id === instance.id);
    if (existing) {
      console.warn(
        `[InstancesBloc] Instance already exists, updating instead: ${instance.id}`,
      );
      this.updateInstance(instance.id, instance);
      return;
    }

    const instances = [...this.state.instances, instance];
    this.patch({ instances });
    console.log(`[InstancesBloc] Instance added (total: ${instances.length})`);
  };

  /**
   * Remove an instance from the list
   */
  removeInstance = (instanceId: string) => {
    console.log(`[InstancesBloc] removeInstance: ${instanceId}`);

    const instances = this.state.instances.filter((i) => i.id !== instanceId);

    // Clean up animation triggers
    const animationTriggers = new Map(this.state.animationTriggers);
    animationTriggers.delete(instanceId);

    this.patch({ instances, animationTriggers });
    console.log(`[InstancesBloc] Instance removed (total: ${instances.length})`);
  };

  /**
   * Update an existing instance (used when duplicate is added)
   */
  updateInstance = (instanceId: string, updates: Partial<InstanceData>) => {
    console.log(`[InstancesBloc] updateInstance: ${instanceId}`);

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
  ) => {
    console.log(`[InstancesBloc] updateInstanceState: ${instanceId}`);

    const instances = this.state.instances.map((inst) => {
      if (inst.id === instanceId) {
        return {
          ...inst,
          state: currentState,
          lastStateChangeTimestamp: Date.now(),
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

    this.patch({ instances, animationTriggers });
    console.log(`[InstancesBloc] Instance state updated: ${instanceId}`);
  };

  /**
   * Set all instances at once (used only for initial load)
   */
  setAllInstances = (instances: InstanceData[]) => {
    console.log(`[InstancesBloc] setAllInstances: ${instances.length} instances`);
    this.patch({ instances: instances.slice() });
  };

  /**
   * Set connection status
   */
  setConnected = (connected: boolean) => {
    console.log(
      `[InstancesBloc] Connection status changed to:`,
      connected ? 'CONNECTED' : 'DISCONNECTED',
    );
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
   * Get all instances sorted by creation time
   */
  get sortedInstances(): InstanceData[] {
    return [...this.state.instances].sort((a, b) => a.createdAt - b.createdAt);
  }
}
