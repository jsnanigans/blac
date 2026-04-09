import { Cubit, blac } from '@blac/core';
import { extractChanges } from '../utils/extractChanges';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';

const MAX_HISTORY_SIZE = 50;

export interface StateSnapshot {
  state: any;
  timestamp: number;
  /** Call stack trace showing where this state change originated */
  callstack?: string;
  /** Method or event name that triggered this state change */
  trigger?: string;
}

type DiffState = {
  // Map of instanceId -> array of state snapshots (newest first)
  stateHistory: Map<string, StateSnapshot[]>;
};

export type DiffResult = {
  previous: any;
  current: any;
  changedOnly: any;
} | null;

/**
 * Manages state history for diff viewing and time-travel debugging
 * Stores up to 50 state snapshots per instance
 */
@blac({ excludeFromDevTools: true })
export class DevToolsDiffBloc extends Cubit<DiffState> {
  private instancesBloc = this.depend(DevToolsInstancesBloc);

  constructor() {
    super({
      stateHistory: new Map(),
    });
  }

  /**
   * Store a state snapshot in the history
   * Maintains up to MAX_HISTORY_SIZE snapshots (newest first)
   */
  storePreviousState = (
    instanceId: string,
    previousState: any,
    callstack?: string,
    trigger?: string,
  ) => {
    const stateHistory = new Map(this.state.stateHistory);
    const history = stateHistory.get(instanceId) || [];

    // Add new snapshot at the beginning (newest first)
    let clonedState: any;
    try {
      clonedState = structuredClone(previousState);
    } catch {
      // Fall back to JSON round-trip for uncloneable values
      try {
        clonedState = JSON.parse(JSON.stringify(previousState));
      } catch {
        clonedState = previousState;
      }
    }
    const newSnapshot: StateSnapshot = {
      state: clonedState,
      timestamp: Date.now(),
      callstack,
      trigger,
    };

    const updatedHistory = [newSnapshot, ...history];

    // Keep only the last MAX_HISTORY_SIZE snapshots
    if (updatedHistory.length > MAX_HISTORY_SIZE) {
      updatedHistory.length = MAX_HISTORY_SIZE;
    }

    stateHistory.set(instanceId, updatedHistory);
    this.patch({ stateHistory });
  };

  /**
   * Clear state history for an instance
   */
  clearPreviousState = (instanceId: string) => {
    const stateHistory = new Map(this.state.stateHistory);
    stateHistory.delete(instanceId);

    this.patch({ stateHistory });
  };

  /**
   * Clear all state histories
   */
  clearAllPreviousStates = () => {
    this.patch({ stateHistory: new Map() });
  };

  /**
   * Load history snapshots from the backend (on initial connect).
   * Snapshots are expected oldest-first; they will be stored newest-first internally.
   */
  loadInstanceHistory = (
    instanceId: string,
    snapshots: Array<{
      state: any;
      timestamp: number;
      callstack?: string;
      trigger?: { name: string };
    }>,
  ) => {
    if (!snapshots.length) return;
    const stateHistory = new Map(this.state.stateHistory);
    // Reverse so newest is first, cap at MAX_HISTORY_SIZE
    const normalized: StateSnapshot[] = [...snapshots]
      .reverse()
      .slice(0, MAX_HISTORY_SIZE)
      .map((s) => ({
        state: s.state,
        timestamp: s.timestamp,
        callstack: s.callstack,
        trigger: s.trigger?.name,
      }));
    stateHistory.set(instanceId, normalized);
    this.patch({ stateHistory });
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

    const instance = this.instancesBloc().getInstance(instanceId);
    if (!instance) return null;

    const previous = previousSnapshot.state ?? null;
    const current = instance.state ?? null;

    // Calculate what actually changed
    const changedOnly = extractChanges(previous, current);

    return {
      previous,
      current,
      changedOnly,
    };
  };
}
