import { Cubit } from '@blac/core';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';

type DiffState = {
  previousStates: Map<string, any>;
};

export type DiffResult = {
  previous: any;
  current: any;
} | null;

/**
 * Manages previous state snapshots for diff viewing
 * Stores one previous state per instance for comparison
 */
export class DevToolsDiffBloc extends Cubit<DiffState> {
  /**
   * Exclude from DevTools to prevent infinite loop
   */
  static __excludeFromDevTools = true;

  constructor() {
    super({
      previousStates: new Map(),
    });
  }

  /**
   * Store previous state for an instance
   */
  storePreviousState = (instanceId: string, previousState: any) => {
    console.log(`[DiffBloc] Storing previous state for: ${instanceId}`);

    const previousStates = new Map(this.state.previousStates);
    previousStates.set(instanceId, structuredClone(previousState));

    this.patch({ previousStates });
  };

  /**
   * Clear previous state for an instance
   */
  clearPreviousState = (instanceId: string) => {
    console.log(`[DiffBloc] Clearing previous state for: ${instanceId}`);

    const previousStates = new Map(this.state.previousStates);
    previousStates.delete(instanceId);

    this.patch({ previousStates });
  };

  /**
   * Clear all previous states
   */
  clearAllPreviousStates = () => {
    console.log(`[DiffBloc] Clearing all previous states`);
    this.patch({ previousStates: new Map() });
  };

  /**
   * Get diff for a specific instance
   * Borrows current state from DevToolsInstancesBloc
   */
  getDiff = (instanceId: string): DiffResult => {
    const previous = this.state.previousStates.get(instanceId);
    if (!previous) return null;

    // Borrow instance data without ownership
    const instancesBloc = DevToolsInstancesBloc.get('default');
    const instance = instancesBloc.getInstance(instanceId);
    if (!instance) return null;

    return {
      previous,
      current: instance.state,
    };
  };
}
