/**
 * LifecycleManager - Clean lifecycle management with state machine pattern
 *
 * Features:
 * - Immutable state transitions
 * - Clear disposal hierarchy
 * - No race conditions by design
 * - Type-safe state machine
 */

import { InstanceId } from '../types/branded';
import { EventStream } from './EventStream';

// ============================================
// Lifecycle States
// ============================================

export enum LifecycleState {
  UNMOUNTED = 'UNMOUNTED',
  MOUNTING = 'MOUNTING',
  MOUNTED = 'MOUNTED',
  UNMOUNTING = 'UNMOUNTING',
  DISPOSED = 'DISPOSED',
}

// ============================================
// Lifecycle Events
// ============================================

export abstract class LifecycleEvent {
  abstract readonly type: string;
  readonly timestamp = Date.now();

  constructor(
    public readonly instanceId: InstanceId,
    public readonly fromState: LifecycleState,
    public readonly toState: LifecycleState,
  ) {}
}

export class MountEvent extends LifecycleEvent {
  readonly type = 'mount';
}

export class UnmountEvent extends LifecycleEvent {
  readonly type = 'unmount';
}

export class DisposeEvent extends LifecycleEvent {
  readonly type = 'dispose';
}

export class StateTransitionEvent extends LifecycleEvent {
  readonly type = 'state-transition';
}

// ============================================
// Lifecycle Manager
// ============================================

export interface LifecycleManagerConfig {
  instanceId: InstanceId;
  debug?: boolean;
  onStateTransition?: (event: StateTransitionEvent) => void;
}

export class LifecycleManager {
  private state: LifecycleState = LifecycleState.UNMOUNTED;
  private readonly instanceId: InstanceId;
  private readonly debug: boolean;
  private readonly eventStream: EventStream<LifecycleEvent>;
  private readonly onStateTransition?: (event: StateTransitionEvent) => void;

  // Track mount/unmount counts for validation
  private mountCount = 0;
  private unmountCount = 0;

  constructor(config: LifecycleManagerConfig) {
    this.instanceId = config.instanceId;
    this.debug = config.debug ?? false;
    this.onStateTransition = config.onStateTransition;
    this.eventStream = new EventStream<LifecycleEvent>();
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get current lifecycle state
   */
  getState(): LifecycleState {
    return this.state;
  }

  /**
   * Check if in a specific state
   */
  isInState(state: LifecycleState): boolean {
    return this.state === state;
  }

  /**
   * Check if mounted
   */
  get isMounted(): boolean {
    return this.state === LifecycleState.MOUNTED;
  }

  /**
   * Check if disposed
   */
  get isDisposed(): boolean {
    return this.state === LifecycleState.DISPOSED;
  }

  /**
   * Subscribe to lifecycle events
   */
  subscribe(callback: (event: LifecycleEvent) => void): () => void {
    return this.eventStream.subscribe(callback);
  }

  // ============================================
  // State Transitions
  // ============================================

  /**
   * Mount the container
   */
  mount(): void {
    this.transition(LifecycleState.MOUNTING, [LifecycleState.UNMOUNTED]);

    try {
      this.mountCount++;

      // Emit mount event
      const event = new MountEvent(
        this.instanceId,
        LifecycleState.UNMOUNTED,
        LifecycleState.MOUNTING,
      );
      this.eventStream.emit(event);

      // Complete mount
      this.transition(LifecycleState.MOUNTED, [LifecycleState.MOUNTING]);

      if (this.debug) {
        console.log(
          `[LifecycleManager] Mounted ${this.instanceId} (count: ${this.mountCount})`,
        );
      }
    } catch (error) {
      // Rollback on error
      this.transition(LifecycleState.UNMOUNTED, [LifecycleState.MOUNTING]);
      throw error;
    }
  }

  /**
   * Unmount the container
   */
  unmount(): void {
    this.transition(LifecycleState.UNMOUNTING, [LifecycleState.MOUNTED]);

    try {
      this.unmountCount++;

      // Emit unmount event
      const event = new UnmountEvent(
        this.instanceId,
        LifecycleState.MOUNTED,
        LifecycleState.UNMOUNTING,
      );
      this.eventStream.emit(event);

      // Complete unmount
      this.transition(LifecycleState.UNMOUNTED, [LifecycleState.UNMOUNTING]);

      if (this.debug) {
        console.log(
          `[LifecycleManager] Unmounted ${this.instanceId} (count: ${this.unmountCount})`,
        );
      }
    } catch (error) {
      // Can't rollback unmount, mark as disposed
      this.transition(LifecycleState.DISPOSED, [LifecycleState.UNMOUNTING]);
      throw error;
    }
  }

  /**
   * Dispose the container permanently
   */
  dispose(): void {
    const validFromStates = [
      LifecycleState.UNMOUNTED,
      LifecycleState.MOUNTED,
      LifecycleState.UNMOUNTING,
    ];

    if (!validFromStates.includes(this.state)) {
      if (this.state === LifecycleState.DISPOSED) {
        return; // Already disposed
      }
      throw new Error(`Cannot dispose from state: ${this.state}`);
    }

    const fromState = this.state;

    // If mounted, unmount first
    if (this.state === LifecycleState.MOUNTED) {
      this.unmount();
    }

    // Transition to disposed
    this.transition(LifecycleState.DISPOSED, [
      LifecycleState.UNMOUNTED,
      LifecycleState.UNMOUNTING,
    ]);

    // Emit dispose event
    const event = new DisposeEvent(
      this.instanceId,
      fromState,
      LifecycleState.DISPOSED,
    );
    this.eventStream.emit(event);

    if (this.debug) {
      console.log(`[LifecycleManager] Disposed ${this.instanceId}`);
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Perform a state transition with validation
   */
  private transition(
    toState: LifecycleState,
    validFromStates: LifecycleState[],
  ): void {
    const fromState = this.state;

    // Validate transition
    if (!validFromStates.includes(fromState)) {
      throw new Error(
        `Invalid state transition: ${fromState} -> ${toState}. ` +
          `Valid from states: ${validFromStates.join(', ')}`,
      );
    }

    // Update state immutably
    this.state = toState;

    // Emit transition event
    const event = new StateTransitionEvent(this.instanceId, fromState, toState);

    this.eventStream.emit(event);

    if (this.onStateTransition) {
      this.onStateTransition(event);
    }

    if (this.debug) {
      console.log(`[LifecycleManager] Transition: ${fromState} -> ${toState}`);
    }
  }

  /**
   * Get lifecycle statistics
   */
  getStats(): {
    state: LifecycleState;
    mountCount: number;
    unmountCount: number;
  } {
    return {
      state: this.state,
      mountCount: this.mountCount,
      unmountCount: this.unmountCount,
    };
  }
}
