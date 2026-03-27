import { Cubit, blac } from '@blac/core';

export interface InstanceMetrics {
  instanceId: string;
  className: string;
  totalUpdates: number;
  /** Rolling updates/sec (5s window) */
  updatesPerSecond: number;
  /** Average ms between updates */
  avgUpdateInterval: number;
  /** Peak updates/sec observed in any 1s window */
  maxBurstRate: number;
  /** Estimated state size in bytes (JSON.stringify length) */
  stateSizeBytes: number;
  lastUpdateTimestamp: number;
  warnings: Array<{
    type: 'high-frequency' | 'large-state';
    message: string;
  }>;
}

type MetricsState = {
  metrics: Map<string, InstanceMetrics>;
  // Per-instance recent update timestamps for rolling calculations
  updateTimestamps: Map<string, number[]>;
};

const HIGH_FREQUENCY_THRESHOLD = 30; // updates/sec
const LARGE_STATE_THRESHOLD = 102400; // 100KB

/**
 * Tracks and computes performance metrics for all BlaC instances.
 * Updated in real-time as state changes arrive.
 */
@blac({ excludeFromDevTools: true })
export class DevToolsMetricsBloc extends Cubit<MetricsState> {
  constructor() {
    super({
      metrics: new Map(),
      updateTimestamps: new Map(),
    });
  }

  /**
   * Record a state update for an instance and recompute its metrics.
   */
  recordUpdate = (
    instanceId: string,
    className: string,
    stateSizeBytes: number,
  ) => {
    const now = Date.now();

    // Get and prune timestamps older than 60s
    const updateTimestamps = new Map(this.state.updateTimestamps);
    const timestamps = (updateTimestamps.get(instanceId) || []).filter(
      (t) => now - t < 60000,
    );
    timestamps.push(now);
    updateTimestamps.set(instanceId, timestamps);

    const metrics = new Map(this.state.metrics);
    const existing = metrics.get(instanceId);
    const totalUpdates = (existing?.totalUpdates ?? 0) + 1;

    const computed = this.computeMetrics(
      instanceId,
      className,
      totalUpdates,
      timestamps,
      stateSizeBytes,
      existing?.maxBurstRate ?? 0,
    );
    metrics.set(instanceId, computed);

    this.patch({ metrics, updateTimestamps });
  };

  removeInstance = (instanceId: string) => {
    const metrics = new Map(this.state.metrics);
    const updateTimestamps = new Map(this.state.updateTimestamps);
    metrics.delete(instanceId);
    updateTimestamps.delete(instanceId);
    this.patch({ metrics, updateTimestamps });
  };

  clearAll = () => {
    this.patch({ metrics: new Map(), updateTimestamps: new Map() });
  };

  /** Get metrics sorted by updates/sec descending */
  get sortedByFrequency(): InstanceMetrics[] {
    return Array.from(this.state.metrics.values()).sort(
      (a, b) => b.updatesPerSecond - a.updatesPerSecond,
    );
  }

  /** Get metrics sorted by state size descending */
  get sortedBySize(): InstanceMetrics[] {
    return Array.from(this.state.metrics.values()).sort(
      (a, b) => b.stateSizeBytes - a.stateSizeBytes,
    );
  }

  /** Get instances with active warnings */
  get instancesWithWarnings(): InstanceMetrics[] {
    return Array.from(this.state.metrics.values()).filter(
      (m) => m.warnings.length > 0,
    );
  }

  private computeMetrics(
    instanceId: string,
    className: string,
    totalUpdates: number,
    timestamps: number[],
    stateSizeBytes: number,
    prevMaxBurstRate: number,
  ): InstanceMetrics {
    const now = Date.now();

    // 5s window for updates/sec
    const window5s = timestamps.filter((t) => now - t < 5000);
    const updatesPerSecond = window5s.length / 5;

    // Average interval
    let avgUpdateInterval = 0;
    if (timestamps.length > 1) {
      let total = 0;
      for (let i = 1; i < timestamps.length; i++) {
        total += timestamps[i] - timestamps[i - 1];
      }
      avgUpdateInterval = total / (timestamps.length - 1);
    }

    // Max burst rate (peak in any 1s window, max with previous)
    let burstRate = prevMaxBurstRate;
    for (let i = 0; i < timestamps.length; i++) {
      const count = timestamps.filter(
        (t) => t >= timestamps[i] && t < timestamps[i] + 1000,
      ).length;
      if (count > burstRate) burstRate = count;
    }

    const warnings: InstanceMetrics['warnings'] = [];

    if (updatesPerSecond > HIGH_FREQUENCY_THRESHOLD) {
      warnings.push({
        type: 'high-frequency',
        message: `${updatesPerSecond.toFixed(1)} updates/sec (threshold: ${HIGH_FREQUENCY_THRESHOLD})`,
      });
    }

    if (stateSizeBytes > LARGE_STATE_THRESHOLD) {
      warnings.push({
        type: 'large-state',
        message: `State is ${(stateSizeBytes / 1024).toFixed(1)}KB (threshold: 100KB)`,
      });
    }

    return {
      instanceId,
      className,
      totalUpdates,
      updatesPerSecond,
      avgUpdateInterval,
      maxBurstRate: burstRate,
      stateSizeBytes,
      lastUpdateTimestamp: timestamps[timestamps.length - 1] ?? 0,
      warnings,
    };
  }
}
