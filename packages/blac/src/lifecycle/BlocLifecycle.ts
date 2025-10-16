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

  /**
   * Disposal generation counter - incremented on every disposal request or cancellation.
   * Used to identify and invalidate stale disposal microtasks.
   * Paired with activeGeneration to implement the generation counter pattern.
   */
  private disposalGeneration = 0;

  /**
   * Active generation - tracks which disposal generation is currently valid.
   * Microtasks compare their captured generation against this value.
   * Invariant: A disposal is valid IFF capturedGeneration === activeGeneration at execution time.
   */
  private activeGeneration = 0;

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

    // Generate unique version for this disposal request
    const generation = ++this.disposalGeneration;
    this.activeGeneration = generation;

    // Queue disposal check
    queueMicrotask(() => {
      // Validate this generation is still active
      if (this.activeGeneration !== generation) {
        // Cancelled or superseded by newer disposal
        return;
      }

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
      // Invalidate current disposal generation
      this.disposalGeneration++;
      this.activeGeneration = this.disposalGeneration;

      // Clear scheduled flag
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
