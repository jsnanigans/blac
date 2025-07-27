import { ConsumerRegistry } from './ConsumerRegistry';

/**
 * NotificationManager handles change notification logic for consumers.
 * It determines whether consumers should be notified based on their dependencies.
 */
export class NotificationManager {
  private notificationCount = 0;
  private suppressedCount = 0;
  private notificationPatterns = new Map<string, number>();

  constructor(private consumerRegistry: ConsumerRegistry) {
    console.log(`🔔 [NotificationManager] Initialized`);
  }

  shouldNotifyConsumer(
    consumerRef: object,
    changedPaths: Set<string>,
  ): boolean {
    const startTime = performance.now();
    const changedPathsArray = Array.from(changedPaths);

    console.log(
      `🔔 [NotificationManager] 🔍 Checking notification for ${changedPathsArray.length} changed paths`,
    );
    console.log(
      `🔔 [NotificationManager] Changed paths:`,
      changedPathsArray.length > 5
        ? [
            ...changedPathsArray.slice(0, 5),
            `... and ${changedPathsArray.length - 5} more`,
          ]
        : changedPathsArray,
    );

    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);
    if (!consumerInfo) {
      console.log(
        `🔔 [NotificationManager] ⚠️ No consumer info - notifying by default`,
      );
      this.notificationCount++;
      return true; // If consumer not registered yet, notify by default
    }

    const dependencies = consumerInfo.tracker.computeDependencies();
    const allPaths = [...dependencies.statePaths, ...dependencies.classPaths];
    const timeSinceLastNotified = Date.now() - consumerInfo.lastNotified;

    console.log(`🔔 [NotificationManager] Consumer ${consumerInfo.id}:`, {
      dependencies: allPaths.length,
      hasRendered: consumerInfo.hasRendered,
      timeSinceLastNotified: `${timeSinceLastNotified}ms`,
    });

    // First render - always notify to establish baseline
    if (!consumerInfo.hasRendered) {
      console.log(`🔔 [NotificationManager] 🆕 First render - will notify`);
      this.notificationCount++;
      this.trackNotificationPattern(consumerInfo.id, 'first-render');
      return true;
    }

    // After first render, if no dependencies tracked, don't notify
    if (allPaths.length === 0) {
      console.log(
        `🔔 [NotificationManager] 🚫 No dependencies tracked - will NOT notify`,
      );
      this.suppressedCount++;
      this.trackNotificationPattern(consumerInfo.id, 'no-dependencies');
      return false;
    }

    // Check which dependencies triggered the change
    const matchingPaths = allPaths.filter((path) => changedPaths.has(path));
    const shouldNotify = matchingPaths.length > 0;

    const endTime = performance.now();

    if (shouldNotify) {
      console.log(
        `🔔 [NotificationManager] ✅ Will notify - ${matchingPaths.length} matching paths:`,
        matchingPaths.length > 3
          ? [
              ...matchingPaths.slice(0, 3),
              `... and ${matchingPaths.length - 3} more`,
            ]
          : matchingPaths,
      );
      this.notificationCount++;
      this.trackNotificationPattern(consumerInfo.id, 'dependency-match');
    } else {
      console.log(
        `🔔 [NotificationManager] ❌ Will NOT notify - no matching dependencies`,
      );
      this.suppressedCount++;
      this.trackNotificationPattern(consumerInfo.id, 'no-match');
    }

    console.log(
      `🔔 [NotificationManager] ⏱️ Check completed in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return shouldNotify;
  }

  updateLastNotified(consumerRef: object): void {
    const now = Date.now();
    const consumerInfo = this.consumerRegistry.getConsumerInfo(consumerRef);

    if (consumerInfo) {
      const timeSinceLast = now - consumerInfo.lastNotified;
      const wasFirstRender = !consumerInfo.hasRendered;

      consumerInfo.lastNotified = now;
      consumerInfo.hasRendered = true;

      console.log(
        `🔔 [NotificationManager] 🕒 Updated notification time for ${consumerInfo.id}`,
      );
      console.log(`🔔 [NotificationManager] Notification stats:`, {
        wasFirstRender,
        timeSinceLast: `${timeSinceLast}ms`,
        totalNotifications: this.notificationCount,
        suppressedNotifications: this.suppressedCount,
        notificationRate: this.getNotificationRate(),
      });
    } else {
      console.log(
        `🔔 [NotificationManager] ⚠️ updateLastNotified - No consumer info found`,
      );
    }
  }

  private trackNotificationPattern(consumerId: string, pattern: string): void {
    const key = `${consumerId}:${pattern}`;
    const count = (this.notificationPatterns.get(key) || 0) + 1;
    this.notificationPatterns.set(key, count);

    if (count > 10 && count % 10 === 0) {
      console.log(
        `🔔 [NotificationManager] 🔥 Pattern alert: ${key} occurred ${count} times`,
      );
    }
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
