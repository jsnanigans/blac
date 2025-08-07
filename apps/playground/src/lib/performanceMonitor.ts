import { BlacPlugin, BlocBase } from '@blac/core';

export interface PerformanceMetrics {
  blocName: string;
  stateChanges: number;
  listeners: number;
  lastUpdate: number;
  renderCount: number;
  averageUpdateTime: number;
  updates: Array<{
    timestamp: number;
    duration: number;
    state: any;
  }>;
}

export interface MemoryMetrics {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private memoryMetrics: MemoryMetrics[] = [];
  private renderCounts: Map<string, number> = new Map();
  private updateCallbacks: Set<
    (metrics: Map<string, PerformanceMetrics>) => void
  > = new Set();
  private memoryCallbacks: Set<(metrics: MemoryMetrics[]) => void> = new Set();
  private memoryInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor() {
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring() {
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in (performance as any)
    ) {
      this.memoryInterval = setInterval(() => {
        const memory = (performance as any).memory;
        const metrics: MemoryMetrics = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now() - this.startTime,
        };

        this.memoryMetrics.push(metrics);

        // Keep only last 100 measurements
        if (this.memoryMetrics.length > 100) {
          this.memoryMetrics.shift();
        }

        this.notifyMemoryCallbacks();
      }, 1000); // Update every second
    }
  }

  trackBlocUpdate(blocName: string, state: any, duration: number) {
    if (!this.metrics.has(blocName)) {
      this.metrics.set(blocName, {
        blocName,
        stateChanges: 0,
        listeners: 0,
        lastUpdate: Date.now(),
        renderCount: 0,
        averageUpdateTime: 0,
        updates: [],
      });
    }

    const metric = this.metrics.get(blocName)!;
    metric.stateChanges++;
    metric.lastUpdate = Date.now();

    // Track update details
    metric.updates.push({
      timestamp: Date.now() - this.startTime,
      duration,
      state: JSON.parse(JSON.stringify(state)), // Deep clone to preserve state
    });

    // Keep only last 50 updates
    if (metric.updates.length > 50) {
      metric.updates.shift();
    }

    // Calculate average update time
    const totalDuration = metric.updates.reduce(
      (sum, u) => sum + u.duration,
      0,
    );
    metric.averageUpdateTime = totalDuration / metric.updates.length;

    this.notifyUpdateCallbacks();
  }

  trackRender(componentName: string) {
    const count = (this.renderCounts.get(componentName) || 0) + 1;
    this.renderCounts.set(componentName, count);

    // Update bloc metrics if it exists
    if (this.metrics.has(componentName)) {
      this.metrics.get(componentName)!.renderCount = count;
    }

    this.notifyUpdateCallbacks();
  }

  trackListenerCount(blocName: string, count: number) {
    if (this.metrics.has(blocName)) {
      this.metrics.get(blocName)!.listeners = count;
      this.notifyUpdateCallbacks();
    }
  }

  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  getMemoryMetrics(): MemoryMetrics[] {
    return [...this.memoryMetrics];
  }

  getRenderCounts(): Map<string, number> {
    return new Map(this.renderCounts);
  }

  onMetricsUpdate(
    callback: (metrics: Map<string, PerformanceMetrics>) => void,
  ) {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  onMemoryUpdate(callback: (metrics: MemoryMetrics[]) => void) {
    this.memoryCallbacks.add(callback);
    return () => this.memoryCallbacks.delete(callback);
  }

  private notifyUpdateCallbacks() {
    this.updateCallbacks.forEach((cb) => cb(this.getMetrics()));
  }

  private notifyMemoryCallbacks() {
    this.memoryCallbacks.forEach((cb) => cb(this.getMemoryMetrics()));
  }

  reset() {
    this.metrics.clear();
    this.memoryMetrics = [];
    this.renderCounts.clear();
    this.startTime = Date.now();
    this.notifyUpdateCallbacks();
    this.notifyMemoryCallbacks();
  }

  cleanup() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    this.updateCallbacks.clear();
    this.memoryCallbacks.clear();
  }
}

export class PerformanceMonitorPlugin implements BlacPlugin {
  readonly name = 'PerformanceMonitor';
  readonly version = '1.0.0';
  private monitor: PerformanceMonitor;
  private updateTimers: Map<string, number> = new Map();

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
  }

  onBlocCreated(bloc: BlocBase<any>): void {
    const blocName = bloc.constructor.name;
    // Initialize metrics for new bloc
    this.monitor.trackBlocUpdate(blocName, bloc.state, 0);
  }

  onStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void {
    const blocName = bloc.constructor.name;

    // Calculate update duration (we'll use a simple timestamp diff)
    const startTime = this.updateTimers.get(blocName) || performance.now();
    const duration = performance.now() - startTime;

    // Track the update
    this.monitor.trackBlocUpdate(blocName, currentState, duration);

    // Track listener count
    const listeners = (bloc as any)._consumers?.size || 0;
    this.monitor.trackListenerCount(blocName, listeners);

    // Set timer for next update
    this.updateTimers.set(blocName, performance.now());
  }

  onBlocDisposed(bloc: BlocBase<any>): void {
    const blocName = bloc.constructor.name;
    this.updateTimers.delete(blocName);
  }
}

// Create a singleton instance for the playground
export const performanceMonitor = new PerformanceMonitor();
