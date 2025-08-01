/**
 * Manages batching of state updates to optimize performance
 */
export class BatchingManager<S> {
  private pendingUpdates: Array<{
    newState: S;
    oldState: S;
    action?: unknown;
  }> = [];
  private isBatching = false;

  /**
   * Execute a callback with batched updates
   */
  batchUpdates(
    callback: () => void,
    onFlush: (finalUpdate: {
      newState: S;
      oldState: S;
      action?: unknown;
    }) => void,
  ): void {
    if (this.isBatching) {
      callback();
      return;
    }

    this.isBatching = true;
    this.pendingUpdates = [];

    try {
      callback();

      if (this.pendingUpdates.length > 0) {
        const finalUpdate = this.pendingUpdates[this.pendingUpdates.length - 1];
        onFlush(finalUpdate);
      }
    } finally {
      this.isBatching = false;
      this.pendingUpdates = [];
    }
  }

  /**
   * Add an update to the batch
   */
  addUpdate(update: { newState: S; oldState: S; action?: unknown }): void {
    if (this.isBatching) {
      this.pendingUpdates.push(update);
    }
  }

  /**
   * Check if currently batching
   */
  get isCurrentlyBatching(): boolean {
    return this.isBatching;
  }
}
