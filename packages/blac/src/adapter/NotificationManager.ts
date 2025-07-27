import { ConsumerRegistry } from './ConsumerRegistry';

/**
 * NotificationManager handles change notification logic for consumers.
 * It determines whether consumers should be notified based on their dependencies.
 */
export class NotificationManager {
  private notificationCount = 0;
  private suppressedCount = 0;
  private notificationPatterns = new Map<string, number>();

  constructor(private consumerRegistry: ConsumerRegistry) {}

  shouldNotifyConsumer(
    consumerRef: object,
    changedPaths: Set<string>,
  ): boolean {
    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);
    if (!consumerInfo) {
      this.notificationCount++;
      return true; // If consumer not registered yet, notify by default
    }

    const dependencies = consumerInfo.tracker.computeDependencies();
    const allPaths = [...dependencies.statePaths, ...dependencies.classPaths];

    // First render - always notify to establish baseline
    if (!consumerInfo.hasRendered) {
      this.notificationCount++;
      this.trackNotificationPattern(consumerInfo.id, 'first-render');
      return true;
    }

    // After first render, if no dependencies tracked, don't notify
    if (allPaths.length === 0) {
      this.suppressedCount++;
      this.trackNotificationPattern(consumerInfo.id, 'no-dependencies');
      return false;
    }

    // Check which dependencies triggered the change
    const matchingPaths = allPaths.filter((path) => changedPaths.has(path));
    const shouldNotify = matchingPaths.length > 0;

    if (shouldNotify) {
      this.notificationCount++;
      this.trackNotificationPattern(consumerInfo.id, 'dependency-match');
    } else {
      this.suppressedCount++;
      this.trackNotificationPattern(consumerInfo.id, 'no-match');
    }

    return shouldNotify;
  }

  updateLastNotified(consumerRef: object): void {
    const now = Date.now();
    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);

    if (consumerInfo) {
      consumerInfo.lastNotified = now;
      consumerInfo.hasRendered = true;
    }
  }

  private trackNotificationPattern(consumerId: string, pattern: string): void {
    const key = `${consumerId}:${pattern}`;
    const count = (this.notificationPatterns.get(key) || 0) + 1;
    this.notificationPatterns.set(key, count);
  }

  private getNotificationRate(): string {
    const total = this.notificationCount + this.suppressedCount;
    if (total === 0) return 'N/A';
    const rate = (this.notificationCount / total) * 100;
    return `${rate.toFixed(1)}%`;
  }

  getStats() {
    return {
      notificationCount: this.notificationCount,
      suppressedCount: this.suppressedCount,
      notificationRate: this.getNotificationRate(),
      patterns: Array.from(this.notificationPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => ({ pattern, count })),
    };
  }
}
