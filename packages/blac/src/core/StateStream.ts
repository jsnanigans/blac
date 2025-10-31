/**
 * StateStream - Immutable state management with structural sharing
 *
 * This class manages state updates and snapshots with efficient memory usage
 * through structural sharing and immutability guarantees.
 */

import { Version, version, incrementVersion } from '../types/branded';
import {
  StateChangeEvent,
  createStateChangeEvent,
  ChangeMetadata,
} from '../types/events';
import { TypedEventEmitter } from '../types/events';
import { debug } from '../logging/Logger';
import { deepEqual } from '../utils/equality';
import { cloneDeep, deepFreeze } from '../utils/immutable';

/**
 * State snapshot with version tracking
 */
export interface StateSnapshot<S> {
  readonly state: S;
  readonly version: Version;
  readonly timestamp: number;
}

/**
 * Options for state updates
 */
export interface UpdateOptions {
  /** Source of the update for debugging */
  source?: string;
  /** Additional metadata about the change */
  metadata?: Partial<ChangeMetadata>;
  /** Skip notification for this update */
  silent?: boolean;
}

/**
 * State update function type
 */
export type StateUpdater<S> = (current: S) => S;

/**
 * StateStream manages immutable state with version tracking
 */
export class StateStream<S> {
  private currentSnapshot: StateSnapshot<S>;
  private history: StateSnapshot<S>[] = [];
  private maxHistorySize: number;
  private eventEmitter = new TypedEventEmitter<StateChangeEvent<S>>();

  /**
   * Create a new StateStream
   * @param initialState Initial state value
   * @param maxHistorySize Maximum number of snapshots to keep (default: 10)
   */
  constructor(initialState: S, maxHistorySize = 10) {
    this.currentSnapshot = {
      state: deepFreeze(cloneDeep(initialState)),
      version: version(0),
      timestamp: Date.now(),
    };
    this.maxHistorySize = maxHistorySize;
    this.history.push(this.currentSnapshot);
  }

  /**
   * Get the current state
   */
  get state(): S {
    return this.currentSnapshot.state;
  }

  /**
   * Get the current version
   */
  get version(): Version {
    return this.currentSnapshot.version;
  }

  /**
   * Get the current snapshot
   */
  get snapshot(): StateSnapshot<S> {
    return this.currentSnapshot;
  }

  /**
   * Update the state
   * @param updater Function that produces the next state
   * @param options Update options
   */
  update(updater: StateUpdater<S>, options: UpdateOptions = {}): void {
    debug('StateStream', 'update', {
      version: this.version,
      source: options.source,
    });

    const previousSnapshot = this.currentSnapshot;
    const nextState = updater(cloneDeep(previousSnapshot.state));

    // Check if state actually changed
    if (deepEqual(previousSnapshot.state, nextState)) {
      return; // No change, skip update
    }

    // Create new snapshot
    const nextSnapshot: StateSnapshot<S> = {
      state: deepFreeze(nextState),
      version: incrementVersion(previousSnapshot.version),
      timestamp: Date.now(),
    };

    // Update current snapshot
    this.currentSnapshot = nextSnapshot;

    // Add to history
    this.addToHistory(nextSnapshot);

    // Emit change event unless silent
    if (!options.silent) {
      const event = createStateChangeEvent(
        previousSnapshot.state,
        nextSnapshot.state,
        nextSnapshot.version,
        {
          source: options.source,
          ...options.metadata,
        },
      );
      this.eventEmitter.emit(event);
    }
  }

  /**
   * Set state directly (replaces current state)
   * @param newState New state value
   * @param options Update options
   */
  setState(newState: S, options: UpdateOptions = {}): void {
    this.update(() => newState, options);
  }

  /**
   * Subscribe to state changes
   * @param handler Event handler
   * @returns Unsubscribe function
   */
  subscribe(handler: (event: StateChangeEvent<S>) => void): () => void {
    return this.eventEmitter.on(handler);
  }

  /**
   * Get state history
   * @param limit Maximum number of snapshots to return
   */
  getHistory(limit?: number): StateSnapshot<S>[] {
    if (limit === undefined) {
      return [...this.history];
    }
    return this.history.slice(-limit);
  }

  /**
   * Clear history (keeps only current snapshot)
   */
  clearHistory(): void {
    this.history = [this.currentSnapshot];
  }

  /**
   * Reset to initial state
   * @param initialState New initial state
   */
  reset(initialState: S): void {
    debug('StateStream', 'reset', {
      version: version(0),
    });

    this.currentSnapshot = {
      state: deepFreeze(cloneDeep(initialState)),
      version: version(0),
      timestamp: Date.now(),
    };
    this.history = [this.currentSnapshot];

    // Emit reset event
    const event = createStateChangeEvent(
      this.currentSnapshot.state, // previous is same as current for reset
      this.currentSnapshot.state,
      this.currentSnapshot.version,
      { source: 'reset' },
    );
    this.eventEmitter.emit(event);
  }

  /**
   * Add snapshot to history with size management
   */
  private addToHistory(snapshot: StateSnapshot<S>): void {
    this.history.push(snapshot);

    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}
