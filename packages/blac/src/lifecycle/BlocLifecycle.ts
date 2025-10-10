/**
 * Enum representing the lifecycle states of a Bloc instance
 */
export enum BlocLifecycleState {
  ACTIVE = 'active',
  DISPOSAL_REQUESTED = 'disposal_requested',
  DISPOSING = 'disposing',
  DISPOSED = 'disposed',
}

export interface StateTransitionResult {
  success: boolean;
  currentState: BlocLifecycleState;
  previousState: BlocLifecycleState;
}

/**
 * Manages the lifecycle state transitions for Bloc instances.
 * Ensures atomic state transitions to prevent race conditions during disposal.
 */
export class BlocLifecycleManager {
  private disposalState = BlocLifecycleState.ACTIVE;
  private disposalLock = false;
  private disposalMicrotaskScheduled = false;
  private disposalHandler?: (bloc: unknown) => void;

  get currentState(): BlocLifecycleState {
    return this.disposalState;
  }

  get isDisposed(): boolean {
    return this.disposalState === BlocLifecycleState.DISPOSED;
  }

  /**
   * Atomic state transition for disposal
   */
  atomicStateTransition(
    expectedState: BlocLifecycleState,
    newState: BlocLifecycleState,
  ): StateTransitionResult {
    if (this.disposalLock) {
      return {
        success: false,
        currentState: this.disposalState,
        previousState: this.disposalState,
      };
    }

    this.disposalLock = true;
    try {
      if (this.disposalState !== expectedState) {
        return {
          success: false,
          currentState: this.disposalState,
          previousState: this.disposalState,
        };
      }

      const previousState = this.disposalState;
      this.disposalState = newState;

      return {
        success: true,
        currentState: newState,
        previousState,
      };
    } finally {
      this.disposalLock = false;
    }
  }

  /**
   * Schedule disposal on next microtask
   */
  scheduleDisposal(
    canDispose: () => boolean,
    onDispose: () => void,
  ): void {
    // Prevent duplicate scheduling
    if (this.disposalMicrotaskScheduled) {
      return;
    }

    // Transition ACTIVE → DISPOSAL_REQUESTED
    const transitionResult = this.atomicStateTransition(
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSAL_REQUESTED,
    );

    if (!transitionResult.success) {
      return;
    }

    // Mark as scheduled
    this.disposalMicrotaskScheduled = true;

    // Queue disposal check
    queueMicrotask(() => {
      this.disposalMicrotaskScheduled = false;

      // Check if disposal should proceed
      if (
        canDispose() &&
        this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED
      ) {
        onDispose();
      } else if (this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED) {
        // Revert to ACTIVE (resubscription occurred)
        this.atomicStateTransition(
          BlocLifecycleState.DISPOSAL_REQUESTED,
          BlocLifecycleState.ACTIVE,
        );
      }
    });
  }

  /**
   * Cancel disposal if in disposal requested state
   */
  cancelDisposal(): boolean {
    if (this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED) {
      // Clear scheduled flag (microtask will check state and abort)
      this.disposalMicrotaskScheduled = false;

      // Transition back to active state
      const result = this.atomicStateTransition(
        BlocLifecycleState.DISPOSAL_REQUESTED,
        BlocLifecycleState.ACTIVE,
      );

      return result.success;
    }
    return false;
  }

  /**
   * Set disposal handler
   */
  setDisposalHandler(handler: (bloc: unknown) => void): void {
    this.disposalHandler = handler;
  }

  /**
   * Get disposal handler
   */
  getDisposalHandler(): ((bloc: unknown) => void) | undefined {
    return this.disposalHandler;
  }
}
