import { ConsumerRegistry } from './ConsumerRegistry';
import { DependencyArray } from './DependencyTracker';

/**
 * DependencyOrchestrator coordinates dependency tracking for consumers.
 * It delegates to ConsumerRegistry for consumer info and manages tracking operations.
 */
export class DependencyOrchestrator {
  private accessCount = 0;
  private lastAnalysisTime = 0;

  constructor(private consumerRegistry: ConsumerRegistry) {
    console.log(`🎯 [DependencyOrchestrator] Initialized`);
  }

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ): void {
    const startTime = performance.now();
    this.accessCount++;

    console.log(
      `🎯 [DependencyOrchestrator] trackAccess #${this.accessCount} - Type: ${type}, Path: ${path}`,
    );

    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);
    if (!consumerInfo) {
      console.log(
        `🎯 [DependencyOrchestrator] ⚠️ No consumer info found for tracking`,
      );
      return;
    }

    const beforeMetrics = consumerInfo.tracker.getMetrics();

    if (type === 'state') {
      consumerInfo.tracker.trackStateAccess(path, value);
      console.log(
        `🎯 [DependencyOrchestrator] ✅ Tracked state access: ${path}`,
      );
    } else {
      consumerInfo.tracker.trackClassAccess(path, value);
      console.log(
        `🎯 [DependencyOrchestrator] ✅ Tracked class access: ${path}`,
      );
    }

    const afterMetrics = consumerInfo.tracker.getMetrics();
    const endTime = performance.now();

    console.log(`🎯 [DependencyOrchestrator] Access tracking stats:`, {
      consumer: consumerInfo.id,
      totalAccessesBefore: beforeMetrics.totalAccesses,
      totalAccessesAfter: afterMetrics.totalAccesses,
      uniquePathsCount: afterMetrics.uniquePaths.size,
      executionTime: `${(endTime - startTime).toFixed(2)}ms`,
    });
  }

  getConsumerDependencies(consumerRef: object): DependencyArray | null {
    const startTime = performance.now();
    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);

    if (!consumerInfo) {
      console.log(
        `🎯 [DependencyOrchestrator] getConsumerDependencies - ⚠️ No consumer info found`,
      );
      return null;
    }

    const deps = consumerInfo.tracker.computeDependencies();
    const endTime = performance.now();

    console.log(
      `🎯 [DependencyOrchestrator] 📊 Dependencies analysis for ${consumerInfo.id}:`,
    );
    console.log(
      `🎯 [DependencyOrchestrator] 📦 State paths (${deps.statePaths.length}):`,
      deps.statePaths.length > 5
        ? [
            ...deps.statePaths.slice(0, 5),
            `... and ${deps.statePaths.length - 5} more`,
          ]
        : deps.statePaths,
    );
    console.log(
      `🎯 [DependencyOrchestrator] 🎭 Class paths (${deps.classPaths.length}):`,
      deps.classPaths.length > 5
        ? [
            ...deps.classPaths.slice(0, 5),
            `... and ${deps.classPaths.length - 5} more`,
          ]
        : deps.classPaths,
    );
    console.log(
      `🎯 [DependencyOrchestrator] ⏱️ Computation time: ${(endTime - startTime).toFixed(2)}ms`,
    );

    // Track analysis frequency
    const now = Date.now();
    if (this.lastAnalysisTime > 0) {
      const timeSinceLastAnalysis = now - this.lastAnalysisTime;
      console.log(
        `🎯 [DependencyOrchestrator] 🕒 Time since last analysis: ${timeSinceLastAnalysis}ms`,
      );
    }
    this.lastAnalysisTime = now;

    return deps;
  }

  resetConsumerTracking(consumerRef: object): void {
    const startTime = performance.now();
    console.log(`🎯 [DependencyOrchestrator] 🔄 resetConsumerTracking called`);

    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);
    if (consumerInfo) {
      const beforeMetrics = consumerInfo.tracker.getMetrics();
      console.log(`🎯 [DependencyOrchestrator] Pre-reset metrics:`, {
        consumer: consumerInfo.id,
        totalAccesses: beforeMetrics.totalAccesses,
        uniquePaths: beforeMetrics.uniquePaths.size,
      });

      consumerInfo.tracker.reset();

      const endTime = performance.now();
      console.log(`🎯 [DependencyOrchestrator] ✅ Consumer tracking reset`);
      console.log(
        `🎯 [DependencyOrchestrator] ⏱️ Reset time: ${(endTime - startTime).toFixed(2)}ms`,
      );
    } else {
      console.log(
        `🎯 [DependencyOrchestrator] ⚠️ No consumer info found to reset`,
      );
    }
  }

  getStats() {
    return {
      totalAccessesTracked: this.accessCount,
      registryStats: this.consumerRegistry.getStats(),
    };
  }
}
