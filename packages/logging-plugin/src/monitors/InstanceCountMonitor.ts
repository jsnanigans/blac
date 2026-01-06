import type { ResolvedConfig } from '../types';

export class InstanceCountMonitor {
  private instanceCounts = new Map<string, number>();
  private warnedClasses = new Set<string>();
  private threshold: number;
  private onWarning: (
    message: string,
    details?: Record<string, unknown>,
  ) => void;

  constructor(
    config: ResolvedConfig,
    onWarning: (message: string, details?: Record<string, unknown>) => void,
  ) {
    this.threshold = config.instanceCountWarningThreshold;
    this.onWarning = onWarning;
  }

  onInstanceCreated(className: string): void {
    const count = (this.instanceCounts.get(className) ?? 0) + 1;
    this.instanceCounts.set(className, count);

    if (count >= this.threshold && !this.warnedClasses.has(className)) {
      this.warnedClasses.add(className);
      this.onWarning(
        `High instance count: ${className} has ${count} instances`,
        {
          className,
          count,
          threshold: this.threshold,
        },
      );
    }
  }

  onInstanceDisposed(className: string): void {
    const count = this.instanceCounts.get(className) ?? 0;
    if (count > 0) {
      this.instanceCounts.set(className, count - 1);
    }

    if (count - 1 < this.threshold) {
      this.warnedClasses.delete(className);
    }
  }

  getStats(): Map<string, number> {
    return new Map(this.instanceCounts);
  }

  reset(): void {
    this.instanceCounts.clear();
    this.warnedClasses.clear();
  }
}
