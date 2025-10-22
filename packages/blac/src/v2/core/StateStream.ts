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
      state: this.deepFreeze(this.cloneDeep(initialState)),
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
    const previousSnapshot = this.currentSnapshot;
    const nextState = updater(this.cloneDeep(previousSnapshot.state));

    // Check if state actually changed
    if (this.deepEqual(previousSnapshot.state, nextState)) {
      return; // No change, skip update
    }

    // Create new snapshot
    const nextSnapshot: StateSnapshot<S> = {
      state: this.deepFreeze(nextState),
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
    this.currentSnapshot = {
      state: this.deepFreeze(this.cloneDeep(initialState)),
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

  /**
   * Deep clone an object (simple implementation, can be optimized)
   */
  private cloneDeep<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.cloneDeep(item)) as unknown as T;
    }

    if (obj instanceof Set) {
      return new Set(
        Array.from(obj).map((item) => this.cloneDeep(item)),
      ) as unknown as T;
    }

    if (obj instanceof Map) {
      const cloned = new Map();
      obj.forEach((value, key) => {
        cloned.set(this.cloneDeep(key), this.cloneDeep(value));
      });
      return cloned as unknown as T;
    }

    // Regular object
    const cloned = Object.create(Object.getPrototypeOf(obj));
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.cloneDeep(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep freeze an object to ensure immutability
   */
  private deepFreeze<T>(obj: T): T {
    if (process.env.NODE_ENV === 'production') {
      // Skip freezing in production for performance
      return obj;
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Skip if already frozen
    if (Object.isFrozen(obj)) {
      return obj;
    }

    Object.freeze(obj);

    // Recursively freeze properties
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = (obj as Record<string, unknown>)[prop];
      if (value && typeof value === 'object') {
        this.deepFreeze(value);
      }
    });

    return obj;
  }

  /**
   * Deep equality check with better typing
   */
  private deepEqual<T>(a: T, b: T): boolean {
    if (a === b) return true;

    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') {
      return a === b;
    }

    // Handle arrays
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    // Handle objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    return keysA.every(
      (key) => keysB.includes(key) && this.deepEqual(a[key], b[key]),
    );
  }
}

