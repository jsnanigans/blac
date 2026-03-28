/**
 * DevToolsBrowserPlugin - BlaC plugin for browser DevTools extension support
 *
 * Provides real-time instance inspection and state monitoring for the
 * BlaC DevTools browser extension using the new plugin API.
 *
 * Acts as the "backend" that stores complete state history and responds
 * to connection requests from DevTools panels.
 */

import type { BlacPlugin, PluginContext, InstanceMetadata } from '@blac/core';
import { safeSerialize } from '../serialization/serialize';
import { DevToolsStateManager } from '../state/DevToolsStateManager';
import type {
  DevToolsEventType,
  DevToolsEvent,
  DevToolsCallback,
  DevToolsBrowserPluginConfig,
  Trigger,
  DependencyEdge,
  DevToolsGraph,
  InstanceMetrics,
  PerformanceWarning,
} from '../types';

// Re-export types for backward compatibility
export type {
  DevToolsEventType,
  DevToolsEvent,
  DevToolsCallback,
  DevToolsBrowserPluginConfig,
};

/**
 * DevTools browser plugin for BlaC
 *
 * This plugin exposes a global API for the browser extension to access.
 */
export class DevToolsBrowserPlugin implements BlacPlugin {
  readonly name = 'DevToolsBrowserPlugin';
  readonly version = '1.0.0';

  private listeners = new Set<DevToolsCallback>();
  private instanceCache = new Map<string, InstanceMetadata>();
  private context?: PluginContext;
  private config: Required<DevToolsBrowserPluginConfig>;
  private instanceTimestamps = new Map<string, number>();

  // Dependency graph tracking
  private dependencyEdges: DependencyEdge[] = [];

  // Performance metrics tracking: instanceId -> sorted array of update timestamps
  private updateTimestamps = new Map<string, number[]>();
  private stateSizeCache = new Map<string, number>();
  private totalUpdateCounts = new Map<string, number>();

  // Persistent event history storage (complete log from app startup)
  private eventHistory: DevToolsEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 10000;

  // State manager for structured state history (backend for DevTools panels)
  private stateManager: DevToolsStateManager;

  constructor(config: DevToolsBrowserPluginConfig = {}) {
    this.config = {
      enabled: true,
      maxInstances: 2000,
      maxSnapshots: 20,
      highFrequencyThreshold: 30,
      largeStateSizeThreshold: 102400,
      ...config,
    };

    this.stateManager = new DevToolsStateManager({
      maxInstances: this.config.maxInstances,
      maxSnapshots: this.config.maxSnapshots,
    });
  }

  onInstall(context: PluginContext): void {
    this.context = context;
    this.scanExistingInstances();
    this.exposeGlobalAPI();
  }

  onUninstall(): void {
    this.listeners.clear();
    this.instanceCache.clear();
    this.instanceTimestamps.clear();
    this.eventHistory = [];
    this.dependencyEdges = [];
    this.updateTimestamps.clear();
    this.stateSizeCache.clear();
    this.totalUpdateCounts.clear();

    if (typeof window !== 'undefined') {
      delete (window as any as Record<string, any>).__BLAC_DEVTOOLS__;
    }
  }

  onInstanceCreated(instance: any, context: PluginContext): void {
    if (this.shouldExcludeInstance(instance)) return;

    const data = this.createInstanceData(instance, context);
    this.instanceCache.set(data.id, data);

    const createdAt = Date.now();
    this.instanceTimestamps.set(data.id, createdAt);
    this.stateManager.addInstance({
      id: data.id,
      className: data.className,
      name: data.name || data.id,
      state: data.state,
      createdAt,
    });

    // Capture dependency edges from this instance
    this.captureDependencies(instance, data.id, data.className);
    const instanceEdges = this.dependencyEdges.filter(
      (e) => e.fromId === data.id,
    );

    this.emit({
      type: 'instance-created',
      timestamp: Date.now(),
      data: instanceEdges.length
        ? { ...data, dependencies: instanceEdges }
        : data,
    });
  }

  onStateChanged(
    instance: any,
    previousState: any,
    currentState: any,
    callstack: string | undefined,
    context: PluginContext,
  ): void {
    if (this.shouldExcludeInstance(instance)) return;

    const trigger = this.extractTriggerFromCallstack(callstack);

    const data = this.createInstanceData(
      instance,
      context,
      previousState,
      currentState,
      callstack,
      trigger,
    );
    this.instanceCache.set(data.id, data);

    const prevSerialized = safeSerialize(previousState);
    const currSerialized = safeSerialize(currentState);
    this.stateManager.updateState(
      data.id,
      prevSerialized.success ? prevSerialized.data : previousState,
      currSerialized.success ? currSerialized.data : currentState,
      callstack,
      trigger,
    );

    // Update performance metrics
    this.recordUpdate(
      data.id,
      currSerialized.success ? JSON.stringify(currSerialized.data).length : 0,
    );

    // Check for performance warnings and emit if needed
    const metrics = this.computeMetrics(data.id);
    if (metrics.warnings.length > 0) {
      this.emit({
        type: 'performance-warning',
        timestamp: Date.now(),
        data: metrics,
      });
    }

    this.emit({
      type: 'instance-updated',
      timestamp: Date.now(),
      data: { ...data, trigger },
    });
  }

  onInstanceDisposed(instance: any, context: PluginContext): void {
    if (this.shouldExcludeInstance(instance)) return;

    const data = this.createInstanceData(instance, context);
    data.isDisposed = true;
    this.instanceCache.delete(data.id);
    this.stateManager.removeInstance(data.id);

    // Remove dependency edges from this instance
    this.dependencyEdges = this.dependencyEdges.filter(
      (e) => e.fromId !== data.id,
    );

    // Clean up metrics tracking
    this.updateTimestamps.delete(data.id);
    this.stateSizeCache.delete(data.id);
    this.totalUpdateCounts.delete(data.id);

    this.emit({
      type: 'instance-disposed',
      timestamp: Date.now(),
      data,
    });
  }

  subscribe(callback: DevToolsCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getInstances(): InstanceMetadata[] {
    return Array.from(this.instanceCache.values());
  }

  getEventHistory(): DevToolsEvent[] {
    return [...this.eventHistory];
  }

  getFullState(): { instances: any[]; timestamp: any } {
    return this.stateManager.getFullState();
  }

  getDependencyGraph(): DevToolsGraph {
    const instances = Array.from(this.instanceCache.values());
    return {
      nodes: instances.map((inst) => ({
        id: inst.id,
        className: inst.className,
        name: inst.name,
      })),
      edges: [...this.dependencyEdges],
    };
  }

  getPerformanceMetrics(
    instanceId?: string,
  ): InstanceMetrics | InstanceMetrics[] {
    if (instanceId) {
      return this.computeMetrics(instanceId);
    }
    return Array.from(this.instanceCache.keys()).map((id) =>
      this.computeMetrics(id),
    );
  }

  getVersion(): string {
    return this.version;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  timeTravel(instanceId: string, state: any): boolean {
    if (!this.context) return false;

    const types = this.context.getAllTypes();
    for (const TypeClass of types) {
      const instances = this.context.queryInstances(TypeClass);
      for (const instance of instances) {
        const metadata = this.context.getInstanceMetadata(instance);
        if (metadata.id === instanceId) {
          if (
            typeof (instance as any as Record<string, any>).emit === 'function'
          ) {
            (instance as any as Record<string, (state: any) => void>).emit(
              state,
            );
          } else if (
            typeof (instance as any as Record<string, any>).update ===
            'function'
          ) {
            (instance as any as Record<string, (cb: () => any) => void>).update(
              () => state,
            );
          } else {
            return false;
          }
          return true;
        }
      }
    }
    return false;
  }

  private scanExistingInstances(): void {
    if (!this.context) return;

    const types = this.context.getAllTypes();
    for (const TypeClass of types) {
      const instances = this.context.queryInstances(TypeClass);
      for (const instance of instances) {
        if (this.shouldExcludeInstance(instance)) continue;

        const data = this.createInstanceData(instance, this.context);
        this.instanceCache.set(data.id, data);

        const createdAt = Date.now();
        this.instanceTimestamps.set(data.id, createdAt);
        this.stateManager.addInstance({
          id: data.id,
          className: data.className,
          name: data.name || data.id,
          state: data.state,
          createdAt,
        });

        this.captureDependencies(instance, data.id, data.className);
      }
    }

    const allInstances = Array.from(this.instanceCache.values());
    this.emit({
      type: 'init',
      timestamp: Date.now(),
      data: allInstances,
    });
  }

  private emit(event: DevToolsEvent): void {
    if (this.eventHistory.length < this.MAX_HISTORY_SIZE) {
      this.eventHistory.push(event);
    } else {
      this.eventHistory.shift();
      this.eventHistory.push(event);
    }

    if (this.listeners.size > 0) {
      this.listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('[DevToolsBrowserPlugin] Listener error:', error);
        }
      });
    }
  }

  private createInstanceData(
    instance: any,
    context: PluginContext,
    previousState?: any,
    currentState?: any,
    callstack?: string,
    _trigger?: Trigger,
  ): InstanceMetadata {
    const metadata = context.getInstanceMetadata(instance);
    const state = context.getState(instance);

    if (!this.instanceTimestamps.has(metadata.id)) {
      this.instanceTimestamps.set(metadata.id, Date.now());
    }

    const serializedState = safeSerialize(state);
    const serializedPrevious = previousState
      ? safeSerialize(previousState)
      : undefined;
    const serializedCurrent = currentState
      ? safeSerialize(currentState)
      : undefined;

    return {
      ...metadata,
      state: serializedState.success ? serializedState.data : state,
      callstack,
      previousState: serializedPrevious
        ? serializedPrevious.success
          ? serializedPrevious.data
          : previousState
        : undefined,
      currentState: serializedCurrent
        ? serializedCurrent.success
          ? serializedCurrent.data
          : currentState
        : undefined,
      hydrationStatus: context.getHydrationStatus(instance),
      hydrationError: metadata.hydrationError,
    } as any as InstanceMetadata;
  }

  private shouldExcludeInstance(instance: any): boolean {
    return (
      ((instance as Record<string, any>)?.constructor as any)
        ?.__excludeFromDevTools === true
    );
  }

  /**
   * Extract the method/function name that triggered a state change from the callstack.
   * The first line of the (already-filtered) callstack is the user code entry point.
   */
  private extractTriggerFromCallstack(callstack?: string): Trigger | undefined {
    if (!callstack) return undefined;
    const firstLine = callstack.split('\n')[0]?.trim();
    if (!firstLine) return undefined;
    // Match "at functionName (" or "at ClassName.methodName ("
    const match = firstLine.match(/at\s+(\S+)\s+\(/);
    if (!match?.[1]) return undefined;
    const raw = match[1];
    // Strip class prefix: "CounterCubit.increment" -> "increment"
    const dotIdx = raw.lastIndexOf('.');
    const name = dotIdx !== -1 ? raw.substring(dotIdx + 1) : raw;
    if (!name || name === '<anonymous>') return undefined;
    return { name };
  }

  /**
   * Capture dependency edges from an instance's dependencies map.
   */
  private captureDependencies(
    instance: any,
    instanceId: string,
    className: string,
  ): void {
    try {
      const deps = instance.dependencies as
        | ReadonlyMap<{ name: string }, string>
        | undefined;
      if (!deps || deps.size === 0) return;

      // Remove old edges from this instance before re-adding
      this.dependencyEdges = this.dependencyEdges.filter(
        (e) => e.fromId !== instanceId,
      );

      for (const [TypeClass, instanceKey] of deps) {
        const toClass =
          (TypeClass as any as Record<string, any>).name ??
          (TypeClass as any).toString();
        // Avoid duplicates
        const exists = this.dependencyEdges.some(
          (e) =>
            e.fromId === instanceId &&
            e.toClass === toClass &&
            e.toKey === instanceKey,
        );
        if (!exists) {
          this.dependencyEdges.push({
            fromId: instanceId,
            fromClass: className,
            toClass,
            toKey: instanceKey,
          });
        }
      }
    } catch {
      // Accessing dependencies on foreign objects can throw — ignore silently
    }
  }

  /**
   * Record a state update for metrics tracking.
   */
  private recordUpdate(instanceId: string, stateSizeBytes: number): void {
    const now = Date.now();

    // Prune timestamps older than 60s
    const timestamps = (this.updateTimestamps.get(instanceId) || []).filter(
      (t) => now - t < 60000,
    );
    timestamps.push(now);
    this.updateTimestamps.set(instanceId, timestamps);

    this.stateSizeCache.set(instanceId, stateSizeBytes);
    this.totalUpdateCounts.set(
      instanceId,
      (this.totalUpdateCounts.get(instanceId) ?? 0) + 1,
    );
  }

  /**
   * Compute rolling performance metrics for a given instance.
   */
  private computeMetrics(instanceId: string): InstanceMetrics {
    const now = Date.now();
    const allTimestamps = this.updateTimestamps.get(instanceId) || [];

    // 5-second window for updates/sec
    const window5s = allTimestamps.filter((t) => now - t < 5000);
    const updatesPerSecond = window5s.length / 5;

    // Average interval
    let avgUpdateInterval = 0;
    if (allTimestamps.length > 1) {
      let totalInterval = 0;
      for (let i = 1; i < allTimestamps.length; i++) {
        totalInterval += allTimestamps[i] - allTimestamps[i - 1];
      }
      avgUpdateInterval = totalInterval / (allTimestamps.length - 1);
    }

    // Max burst rate (peak in any 1s window)
    let maxBurstRate = 0;
    for (let i = 0; i < allTimestamps.length; i++) {
      const windowStart = allTimestamps[i];
      const count = allTimestamps.filter(
        (t) => t >= windowStart && t < windowStart + 1000,
      ).length;
      if (count > maxBurstRate) maxBurstRate = count;
    }

    const stateSizeBytes = this.stateSizeCache.get(instanceId) ?? 0;
    const totalUpdates = this.totalUpdateCounts.get(instanceId) ?? 0;
    const lastUpdateTimestamp = allTimestamps[allTimestamps.length - 1] ?? 0;

    const warnings: PerformanceWarning[] = [];

    if (updatesPerSecond > this.config.highFrequencyThreshold) {
      warnings.push({
        type: 'high-frequency',
        message: `${instanceId} is updating ${updatesPerSecond.toFixed(1)} times/sec (threshold: ${this.config.highFrequencyThreshold})`,
        threshold: this.config.highFrequencyThreshold,
        actual: updatesPerSecond,
      });
    }

    if (stateSizeBytes > this.config.largeStateSizeThreshold) {
      warnings.push({
        type: 'large-state',
        message: `${instanceId} state is ${(stateSizeBytes / 1024).toFixed(1)}KB (threshold: ${(this.config.largeStateSizeThreshold / 1024).toFixed(0)}KB)`,
        threshold: this.config.largeStateSizeThreshold,
        actual: stateSizeBytes,
      });
    }

    return {
      instanceId,
      totalUpdates,
      updatesPerSecond,
      avgUpdateInterval,
      maxBurstRate,
      stateSizeBytes,
      lastUpdateTimestamp,
      warnings,
    };
  }

  private exposeGlobalAPI(): void {
    if (typeof window === 'undefined') return;

    (window as any as Record<string, any>).__BLAC_DEVTOOLS__ = {
      getInstances: () => this.getInstances(),
      getEventHistory: () => this.getEventHistory(),
      getFullState: () => this.getFullState(),
      subscribe: (callback: DevToolsCallback) => this.subscribe(callback),
      getVersion: () => this.getVersion(),
      isEnabled: () => this.enabled,
      timeTravel: (instanceId: string, state: any) =>
        this.timeTravel(instanceId, state),
      getDependencyGraph: () => this.getDependencyGraph(),
      getPerformanceMetrics: (instanceId?: string) => {
        const result = this.getPerformanceMetrics(instanceId);
        return result;
      },
    };
  }
}

/**
 * Create and configure DevTools browser plugin
 */
export function createDevToolsBrowserPlugin(
  config?: DevToolsBrowserPluginConfig,
): DevToolsBrowserPlugin {
  return new DevToolsBrowserPlugin(config);
}
