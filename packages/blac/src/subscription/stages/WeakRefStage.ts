/**
 * WeakRef Stage
 *
 * Manages weak references to consumers for automatic cleanup
 * when consumers are garbage collected.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';

export interface WeakRefTarget {
  readonly id: string;
  readonly target: object;
}

export class WeakRefStage extends PipelineStage {
  private weakRefs: Map<string, WeakRef<object>> = new Map();
  private cleanupRegistry?: FinalizationRegistry<string>;
  private lastCleanup: number = Date.now();
  private readonly cleanupInterval = 10000; // 10 seconds

  constructor() {
    super('WeakRef', 950); // Runs early to check if consumer still exists

    // Set up finalization registry for automatic cleanup
    if (typeof FinalizationRegistry !== 'undefined') {
      this.cleanupRegistry = new FinalizationRegistry((id: string) => {
        this.handleFinalization(id);
      });
    }
  }

  /**
   * Register a weak reference to a consumer
   */
  registerConsumer(id: string, target: object): void {
    const weakRef = new WeakRef(target);
    this.weakRefs.set(id, weakRef);

    // Register for finalization callback
    if (this.cleanupRegistry) {
      this.cleanupRegistry.register(target, id);
    }
  }

  /**
   * Unregister a consumer
   */
  unregisterConsumer(id: string): void {
    this.weakRefs.delete(id);
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    const consumerId = context.metadata.get('consumerId') as string | undefined;

    if (!consumerId) {
      // No consumer ID, continue processing
      return context;
    }

    const weakRef = this.weakRefs.get(consumerId);

    if (!weakRef) {
      // No weak reference registered, continue normally
      return context;
    }

    const target = weakRef.deref();

    if (!target) {
      // Consumer has been garbage collected
      context.shouldContinue = false;
      context.skipNotification = true;
      context.metadata.set('consumerGarbageCollected', true);
      context.metadata.set('cleanupReason', 'weakref_deref_null');

      // Remove the weak reference
      this.weakRefs.delete(consumerId);

      // Signal that this subscription should be removed
      context.metadata.set('removeSubscription', true);
    } else {
      // Consumer still exists, update last seen
      context.metadata.set('consumerAlive', true);
    }

    // Periodic cleanup check
    if (Date.now() - this.lastCleanup > this.cleanupInterval) {
      this.performCleanup();
    }

    return context;
  }

  /**
   * Handle finalization of a consumer
   */
  private handleFinalization(id: string): void {
    // Consumer was garbage collected
    this.weakRefs.delete(id);

    // Could trigger additional cleanup logic here
    // For example, notifying the registry to remove associated subscriptions
  }

  /**
   * Perform periodic cleanup of dead references
   */
  private performCleanup(): void {
    const deadRefs: string[] = [];

    for (const [id, weakRef] of this.weakRefs.entries()) {
      if (!weakRef.deref()) {
        deadRefs.push(id);
      }
    }

    for (const id of deadRefs) {
      this.weakRefs.delete(id);
    }

    this.lastCleanup = Date.now();
  }

  /**
   * Get statistics about weak references
   */
  getStats(): {
    totalRefs: number;
    aliveRefs: number;
    deadRefs: number;
  } {
    let aliveCount = 0;
    let deadCount = 0;

    for (const weakRef of this.weakRefs.values()) {
      if (weakRef.deref()) {
        aliveCount++;
      } else {
        deadCount++;
      }
    }

    return {
      totalRefs: this.weakRefs.size,
      aliveRefs: aliveCount,
      deadRefs: deadCount,
    };
  }

  cleanup(): void {
    this.weakRefs.clear();
    this.cleanupRegistry = undefined;
  }
}
