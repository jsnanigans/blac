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
  private disposalTimer?: NodeJS.Timeout | number;
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
   * Schedule disposal after a delay
   */
  scheduleDisposal(
    delay: number,
    canDispose: () => boolean,
    onDispose: () => void,
  ): void {
    // Cancel any existing disposal timer
    if (this.disposalTimer) {
      clearTimeout(this.disposalTimer as NodeJS.Timeout);
      this.disposalTimer = undefined;
    }

    const transitionResult = this.atomicStateTransition(
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSAL_REQUESTED,
    );

    if (!transitionResult.success) {
      return;
    }

    this.disposalTimer = setTimeout(() => {
      if (
        canDispose() &&
        this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED
      ) {
        onDispose();
      } else {
        this.atomicStateTransition(
          BlocLifecycleState.DISPOSAL_REQUESTED,
          BlocLifecycleState.ACTIVE,
        );
      }
    }, delay);
  }

  /**
   * Cancel disposal if in disposal requested state
   */
  cancelDisposal(): boolean {
    if (this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED) {
      // Cancel disposal timer
      if (this.disposalTimer) {
        clearTimeout(this.disposalTimer as NodeJS.Timeout);
        this.disposalTimer = undefined;
      }

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

  /**
   * Clear disposal timer
   */
  clearDisposalTimer(): void {
    if (this.disposalTimer) {
      clearTimeout(this.disposalTimer as NodeJS.Timeout);
      this.disposalTimer = undefined;
    }
  }
}
