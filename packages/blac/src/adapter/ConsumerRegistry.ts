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
    const startTime = performance.now();
    this.registrationCount++;

    console.log(`📋 [ConsumerRegistry] Registering consumer: ${consumerId}`);
    console.log(
      `📋 [ConsumerRegistry] Registration #${this.registrationCount}`,
    );

    const existingConsumer = this.consumers.get(consumerRef);
    if (existingConsumer) {
      console.log(
        `📋 [ConsumerRegistry] ⚠️ Re-registering existing consumer: ${existingConsumer.id} -> ${consumerId}`,
      );
    } else {
      this.activeConsumers++;
    }

    const tracker = new DependencyTracker();
    console.log(
      `📋 [ConsumerRegistry] Created DependencyTracker for consumer ${consumerId}`,
    );

    this.consumers.set(consumerRef, {
      id: consumerId,
      tracker,
      lastNotified: Date.now(),
      hasRendered: false,
    });

    const endTime = performance.now();
    console.log(`📋 [ConsumerRegistry] Consumer registered successfully`);
    console.log(
      `📋 [ConsumerRegistry] ⏱️ Registration time: ${(endTime - startTime).toFixed(2)}ms`,
    );
    console.log(
      `📋 [ConsumerRegistry] 📊 Active consumers: ${this.activeConsumers}`,
    );
  }

  unregister(consumerRef: object): void {
    const startTime = performance.now();
    console.log(`📋 [ConsumerRegistry] Unregistering consumer`);

    if (consumerRef) {
      const consumerInfo = this.consumers.get(consumerRef);
      if (consumerInfo) {
        const lifetimeMs = Date.now() - consumerInfo.lastNotified;
        console.log(
          `📋 [ConsumerRegistry] Unregistering consumer: ${consumerInfo.id}`,
        );
        console.log(`📋 [ConsumerRegistry] Consumer lifetime: ${lifetimeMs}ms`);
        console.log(
          `📋 [ConsumerRegistry] Consumer rendered: ${consumerInfo.hasRendered}`,
        );

        const metrics = consumerInfo.tracker.getMetrics();
        console.log(`📋 [ConsumerRegistry] Consumer metrics:`, {
          totalAccesses: metrics.totalAccesses,
          uniquePaths: metrics.uniquePaths.size,
        });

        this.consumers.delete(consumerRef);
        this.activeConsumers = Math.max(0, this.activeConsumers - 1);
        console.log(`📋 [ConsumerRegistry] Consumer unregistered`);
      } else {
        console.log(`📋 [ConsumerRegistry] ⚠️ Consumer not found in registry`);
      }
    } else {
      console.log(`📋 [ConsumerRegistry] ⚠️ No consumer reference provided`);
    }

    const endTime = performance.now();
    console.log(
      `📋 [ConsumerRegistry] ⏱️ Unregistration time: ${(endTime - startTime).toFixed(2)}ms`,
    );
    console.log(
      `📋 [ConsumerRegistry] 📊 Active consumers: ${this.activeConsumers}`,
    );
  }

  getConsumerInfo(consumerRef: object): ConsumerInfo | undefined {
    const info = this.consumers.get(consumerRef);
    if (info) {
      console.log(
        `📋 [ConsumerRegistry] Retrieved info for consumer: ${info.id}`,
      );
    }
    return info;
  }

  hasConsumer(consumerRef: object): boolean {
    const has = this.consumers.has(consumerRef);
    console.log(`📋 [ConsumerRegistry] Checking consumer existence: ${has}`);
    return has;
  }

  getStats() {
    return {
      totalRegistrations: this.registrationCount,
      activeConsumers: this.activeConsumers,
    };
  }
}
