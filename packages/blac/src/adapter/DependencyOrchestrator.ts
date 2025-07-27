import { ConsumerRegistry } from './ConsumerRegistry';
import { DependencyArray } from './DependencyTracker';

/**
 * DependencyOrchestrator coordinates dependency tracking for consumers.
 * It delegates to ConsumerRegistry for consumer info and manages tracking operations.
 */
export class DependencyOrchestrator {
  private accessCount = 0;
  private lastAnalysisTime = 0;

  constructor(private consumerRegistry: ConsumerRegistry) {}

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ): void {
    this.accessCount++;

    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);
    if (!consumerInfo) {
      return;
    }

    if (type === 'state') {
      consumerInfo.tracker.trackStateAccess(path, value);
    } else {
      consumerInfo.tracker.trackClassAccess(path, value);
    }
  }

  getConsumerDependencies(consumerRef: object): DependencyArray | null {
    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);

    if (!consumerInfo) {
      return null;
    }

    const deps = consumerInfo.tracker.computeDependencies();

    // Track analysis frequency
    const now = Date.now();
    this.lastAnalysisTime = now;

    return deps;
  }

  resetConsumerTracking(consumerRef: object): void {
    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);
    if (consumerInfo) {
      consumerInfo.tracker.reset();
    }
  }

  getStats() {
    return {
      totalAccessesTracked: this.accessCount,
      registryStats: this.consumerRegistry.getStats(),
    };
  }
}
