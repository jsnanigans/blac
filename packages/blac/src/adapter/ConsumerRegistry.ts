import { DependencyTracker } from './DependencyTracker';

export interface ConsumerInfo {
  id: string;
  tracker: DependencyTracker;
  lastNotified: number;
  hasRendered: boolean;
}

/**
 * ConsumerRegistry manages the registration and lifecycle of consumers.
 * It uses a WeakMap for automatic garbage collection when consumers are no longer referenced.
 */
export class ConsumerRegistry {
  private consumers = new WeakMap<object, ConsumerInfo>();
  private registrationCount = 0;
  private activeConsumers = 0;

  register(consumerRef: object, consumerId: string): void {
    this.registrationCount++;

    const existingConsumer = this.consumers.get(consumerRef);
    if (!existingConsumer) {
      this.activeConsumers++;
    }

    const tracker = new DependencyTracker();

    this.consumers.set(consumerRef, {
      id: consumerId,
      tracker,
      lastNotified: Date.now(),
      hasRendered: false,
    });
  }

  unregister(consumerRef: object): void {
    if (consumerRef) {
      const consumerInfo = this.consumers.get(consumerRef);
      if (consumerInfo) {
        this.consumers.delete(consumerRef);
        this.activeConsumers = Math.max(0, this.activeConsumers - 1);
      }
    }
  }

  getConsumerInfo(consumerRef: object): ConsumerInfo | undefined {
    return this.consumers.get(consumerRef);
  }

  hasConsumer(consumerRef: object): boolean {
    return this.consumers.has(consumerRef);
  }

  getStats() {
    return {
      totalRegistrations: this.registrationCount,
      activeConsumers: this.activeConsumers,
    };
  }
}
