import type { ResolvedConfig } from '../types';

interface LifecycleEvent {
  timestamp: number;
  type: 'created' | 'disposed';
}

interface InstanceInfo {
  createdAt: number;
  stateChangeCount: number;
}

export class LifecycleMonitor {
  private lifecycleHistory = new Map<string, LifecycleEvent[]>();
  private instanceInfo = new Map<string, InstanceInfo>();
  private windowMs: number;
  private threshold: number;
  private enabled: boolean;
  private warnedClasses = new Set<string>();
  private onWarning: (
    message: string,
    details?: Record<string, unknown>,
  ) => void;

  constructor(
    config: ResolvedConfig,
    onWarning: (message: string, details?: Record<string, unknown>) => void,
  ) {
    this.windowMs = config.rapidLifecycleWindowMs;
    this.threshold = config.rapidLifecycleThreshold;
    this.enabled = config.detectRapidLifecycles;
    this.onWarning = onWarning;
  }

  onInstanceCreated(className: string, instanceId: string): void {
    if (!this.enabled) return;

    this.instanceInfo.set(instanceId, {
      createdAt: Date.now(),
      stateChangeCount: 0,
    });

    this.recordEvent(className, 'created');
    this.checkRapidLifecycle(className);
  }

  onInstanceDisposed(className: string, instanceId: string): void {
    if (!this.enabled) return;

    const info = this.instanceInfo.get(instanceId);
    if (info && info.stateChangeCount === 0) {
      this.onWarning(
        `Unused instance: ${className}#${instanceId.slice(0, 8)} disposed without state changes`,
        {
          className,
          instanceId,
          lifespan: Date.now() - info.createdAt,
        },
      );
    }

    this.instanceInfo.delete(instanceId);
    this.recordEvent(className, 'disposed');
    this.checkRapidLifecycle(className);
  }

  onStateChanged(instanceId: string): void {
    const info = this.instanceInfo.get(instanceId);
    if (info) {
      info.stateChangeCount++;
    }
  }

  getInstanceInfo(instanceId: string): InstanceInfo | undefined {
    return this.instanceInfo.get(instanceId);
  }

  private recordEvent(className: string, type: 'created' | 'disposed'): void {
    const now = Date.now();
    const events = this.lifecycleHistory.get(className) ?? [];

    events.push({ timestamp: now, type });

    const cutoff = now - this.windowMs;
    const filtered = events.filter((e) => e.timestamp > cutoff);
    this.lifecycleHistory.set(className, filtered);
  }

  private checkRapidLifecycle(className: string): void {
    const events = this.lifecycleHistory.get(className) ?? [];
    const cycleCount = Math.min(
      events.filter((e) => e.type === 'created').length,
      events.filter((e) => e.type === 'disposed').length,
    );

    if (cycleCount >= this.threshold && !this.warnedClasses.has(className)) {
      this.warnedClasses.add(className);
      this.onWarning(
        `Rapid lifecycle: ${className} created/disposed ${cycleCount} times in ${this.windowMs}ms`,
        {
          className,
          cycleCount,
          windowMs: this.windowMs,
          threshold: this.threshold,
        },
      );

      setTimeout(() => {
        this.warnedClasses.delete(className);
      }, this.windowMs);
    }
  }

  reset(): void {
    this.lifecycleHistory.clear();
    this.instanceInfo.clear();
    this.warnedClasses.clear();
  }
}
