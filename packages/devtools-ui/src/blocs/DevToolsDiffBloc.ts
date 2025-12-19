import { Cubit, blac, borrow } from '@blac/core';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';

const MAX_HISTORY_SIZE = 50;

export interface StateSnapshot {
  state: any;
  timestamp: number;
  /** Call stack trace showing where this state change originated */
  callstack?: string;
}

type DiffState = {
  // Map of instanceId -> array of state snapshots (newest first)
  stateHistory: Map<string, StateSnapshot[]>;
};

export type DiffResult = {
  previous: any;
  current: any;
  changedOnly: any; // Only the properties that changed
} | null;

/**
 * Manages state history for diff viewing and time-travel debugging
 * Stores up to 50 state snapshots per instance
 */
@blac({ excludeFromDevTools: true })
export class DevToolsDiffBloc extends Cubit<DiffState> {
  constructor() {
    super({
      stateHistory: new Map(),
    });
  }

  /**
   * Store a state snapshot in the history
   * Maintains up to MAX_HISTORY_SIZE snapshots (newest first)
   */
  storePreviousState = (instanceId: string, previousState: any, callstack?: string) => {
    console.log(`[DiffBloc] Storing state snapshot for: ${instanceId}${callstack ? ' (with callstack)' : ''}`);

    const stateHistory = new Map(this.state.stateHistory);
    const history = stateHistory.get(instanceId) || [];

    // Add new snapshot at the beginning (newest first)
    const newSnapshot: StateSnapshot = {
      state: structuredClone(previousState),
      timestamp: Date.now(),
      callstack,
    };

    const updatedHistory = [newSnapshot, ...history];

    // Keep only the last MAX_HISTORY_SIZE snapshots
    if (updatedHistory.length > MAX_HISTORY_SIZE) {
      updatedHistory.length = MAX_HISTORY_SIZE;
    }

    stateHistory.set(instanceId, updatedHistory);
    this.patch({ stateHistory });

    console.log(
      `[DiffBloc] State history updated (${updatedHistory.length} snapshots)`,
    );
  };

  /**
   * Clear state history for an instance
   */
  clearPreviousState = (instanceId: string) => {
    console.log(`[DiffBloc] Clearing state history for: ${instanceId}`);

    const stateHistory = new Map(this.state.stateHistory);
    stateHistory.delete(instanceId);

    this.patch({ stateHistory });
  };

  /**
   * Clear all state histories
   */
  clearAllPreviousStates = () => {
    console.log(`[DiffBloc] Clearing all state histories`);
    this.patch({ stateHistory: new Map() });
  };

  /**
   * Get state history for an instance
   * Returns array of snapshots (newest first)
   */
  getHistory = (instanceId: string): StateSnapshot[] => {
    return this.state.stateHistory.get(instanceId) || [];
  };

  /**
   * Get diff for a specific instance
   * Compares most recent snapshot with current state
   * Borrows current state from DevToolsInstancesBloc
   */
  getDiff = (instanceId: string): DiffResult => {
    const history = this.state.stateHistory.get(instanceId);
    if (!history || history.length === 0) return null;

    // Get most recent snapshot (first in array)
    const previousSnapshot = history[0];

    // Borrow instance data without ownership
    const instancesBloc = borrow(DevToolsInstancesBloc);
    const instance = instancesBloc.getInstance(instanceId);
    if (!instance) return null;

    const previous = previousSnapshot.state;
    const current = instance.state;

    // Calculate what actually changed
    const changedOnly = this.extractChanges(previous, current);

    return {
      previous,
      current,
      changedOnly,
    };
  };

  /**
   * Extract only the properties that changed between two states
   * Returns an object containing only changed paths
   */
  private extractChanges = (previous: any, current: any): any => {
    // If types are different, return current
    if (typeof previous !== typeof current) {
      return current;
    }

    // If not objects, compare directly
    if (typeof current !== 'object' || current === null) {
      return previous !== current ? current : undefined;
    }

    // Handle arrays
    if (Array.isArray(current)) {
      if (!Array.isArray(previous) || previous.length !== current.length) {
        return current;
      }

      const changes: any[] = [];
      let hasChanges = false;

      for (let i = 0; i < current.length; i++) {
        const itemChange = this.extractChanges(previous[i], current[i]);
        if (itemChange !== undefined) {
          hasChanges = true;
          changes[i] = itemChange;
        }
      }

      return hasChanges ? current : undefined;
    }

    // Handle objects
    const changes: any = {};
    let hasChanges = false;

    // Check all keys in current
    for (const key in current) {
      if (!(key in previous)) {
        // New key added
        changes[key] = current[key];
        hasChanges = true;
      } else {
        const change = this.extractChanges(previous[key], current[key]);
        if (change !== undefined) {
          changes[key] = change;
          hasChanges = true;
        }
      }
    }

    // Check for deleted keys
    for (const key in previous) {
      if (!(key in current)) {
        changes[key] = undefined; // Mark as deleted
        hasChanges = true;
      }
    }

    return hasChanges ? changes : undefined;
  };
}
