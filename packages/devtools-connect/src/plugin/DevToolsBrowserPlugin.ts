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
import { enumerateGetters } from '../getters/enumerateGetters';
import { DevToolsStateManager } from '../state/DevToolsStateManager';
import type {
  DevToolsEvent,
  DevToolsCallback,
  DevToolsBrowserPluginConfig,
  Trigger,
  DependencyEdge,
  DevToolsGraph,
  InstanceMetrics,
  PerformanceWarning,
  ConsumerInfo,
  RefHolderInfo,
} from '../types';

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

  // Dependency graph tracking: fromId -> edges
  private dependencyEdgesByFrom = new Map<string, DependencyEdge[]>();

  // Performance metrics tracking: instanceId -> sorted array of update timestamps
  private updateTimestamps = new Map<string, number[]>();
  private stateSizeCache = new Map<string, number>();
  private totalUpdateCounts = new Map<string, number>();

  // Consumer tracking: instanceId -> Map<consumerId, ConsumerInfo>
  private consumers = new Map<string, Map<string, ConsumerInfo>>();

  // Ref holder tracking: instanceId -> Map<refId, RefHolderInfo>
  private refHolders = new Map<string, Map<string, RefHolderInfo>>();

  // Unique per plugin instance — new page load = new session ID
  private readonly sessionId: string =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  // Persistent event history storage (ring buffer for O(1) insert)
  private eventHistoryBuffer: DevToolsEvent[] = [];
  private eventHistoryHead = 0;
  private eventHistoryCount = 0;
  private readonly MAX_HISTORY_SIZE = 10000;

  private readonly FULL_SYNC_INTERVAL = 3000;
  private fullSyncTimer: ReturnType<typeof setInterval> | undefined;
  private extensionConnected = false;
  private handleExtensionMessage = (event: MessageEvent): void => {
    if (event.source !== window) return;
    if ((event.data as Record<string, any>)?.source !== 'blac-devtools-content')
      return;
    const cmd = event.data as Record<string, any>;
    this.extensionConnected = true;
    switch (cmd.type) {
      case 'PING':
        this.broadcastToExtension({
          type: 'PONG',
          payload: { timestamp: Date.now() },
        });
        break;
      case 'GET_INSTANCES':
        this.broadcastFullState();
        break;
      case 'TIME_TRAVEL':
        this.timeTravel(cmd.instanceId as string, cmd.state);
        break;
    }
  };

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
    if (!this.config.enabled) return;
    this.exposeGlobalAPI();
    this.scanExistingInstances();
    this.startExtensionBridge();
    this.broadcastFullState();
  }

  onUninstall(): void {
    this.stopExtensionBridge();
    this.listeners.clear();
    this.instanceCache.clear();
    this.instanceTimestamps.clear();
    this.eventHistoryBuffer = [];
    this.eventHistoryHead = 0;
    this.eventHistoryCount = 0;
    this.dependencyEdgesByFrom.clear();
    this.consumers.clear();
    this.refHolders.clear();
    this.updateTimestamps.clear();
    this.stateSizeCache.clear();
    this.totalUpdateCounts.clear();

    if (typeof window !== 'undefined') {
      delete (window as any as Record<string, any>).__BLAC_DEVTOOLS__;
    }
  }

  onInstanceCreated(instance: any, context: PluginContext): void {
    if (!this.config.enabled) return;
    if (this.shouldExcludeInstance(instance)) return;

    const now = Date.now();
    const createdFrom = this.captureCallstack();
    const data = this.createInstanceData(instance, context);
    this.instanceCache.set(data.id, data);

    this.instanceTimestamps.set(data.id, now);
    this.stateManager.addInstance({
      id: data.id,
      className: data.className,
      name: data.name || data.id,
      state: data.state,
      createdAt: now,
      getters: (data as any).getters,
      createdFrom,
    });

    // Capture dependency edges from this instance
    this.captureDependencies(instance, data.id, data.className);
    const instanceEdges = this.dependencyEdgesByFrom.get(data.id) ?? [];

    const eventData = { ...data, createdFrom };
    this.emit({
      type: 'instance-created',
      timestamp: now,
      data: instanceEdges.length
        ? { ...eventData, dependencies: instanceEdges }
        : eventData,
    });
  }

  onStateChanged(
    instance: any,
    previousState: any,
    currentState: any,
    context: PluginContext,
  ): void {
    if (!this.config.enabled) return;
    if (this.shouldExcludeInstance(instance)) return;

    const callstack = this.captureCallstack();
    const trigger = this.extractTriggerFromCallstack(callstack);

    const data = this.createInstanceData(
      instance,
      context,
      previousState,
      currentState,
      callstack,
    );
    this.instanceCache.set(data.id, data);

    // Reuse already-serialized states from createInstanceData
    this.stateManager.updateState(
      data.id,
      (data as any).previousState ?? previousState,
      (data as any).currentState ?? currentState,
      callstack,
      trigger,
      (data as any).getters,
    );

    // Update performance metrics — estimate size from current state
    const stateStr = (data as any).currentState;
    const estimatedSize =
      stateStr !== undefined ? JSON.stringify(stateStr).length : 0;
    this.recordUpdate(data.id, estimatedSize);

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
    if (!this.config.enabled) return;
    if (this.shouldExcludeInstance(instance)) return;

    const data = this.createInstanceData(instance, context);
    data.isDisposed = true;
    this.instanceCache.delete(data.id);
    this.stateManager.removeInstance(data.id);

    // Remove dependency edges from this instance
    this.dependencyEdgesByFrom.delete(data.id);

    // Clean up consumers, ref holders, and metrics tracking
    this.consumers.delete(data.id);
    this.refHolders.delete(data.id);
    this.updateTimestamps.delete(data.id);
    this.stateSizeCache.delete(data.id);
    this.totalUpdateCounts.delete(data.id);

    this.emit({
      type: 'instance-disposed',
      timestamp: Date.now(),
      data,
    });
  }

  onRefAcquired(instance: any, refId: string, _context: PluginContext): void {
    if (!this.config.enabled) return;
    if (this.shouldExcludeInstance(instance)) return;

    const instanceId = (instance as any).instanceId as string;
    if (!instanceId || !this.instanceCache.has(instanceId)) return;

    let stackTrace: string | undefined;
    try {
      stackTrace = new Error().stack;
    } catch {
      /* ignore */
    }

    let holders = this.refHolders.get(instanceId);
    if (!holders) {
      holders = new Map();
      this.refHolders.set(instanceId, holders);
    }

    holders.set(refId, {
      refId,
      acquiredAt: Date.now(),
      stackTrace,
    });

    this.emitConsumersChanged(instanceId);
  }

  onRefReleased(instance: any, refId: string, _context: PluginContext): void {
    if (!this.config.enabled) return;
    if (this.shouldExcludeInstance(instance)) return;

    const instanceId = (instance as any).instanceId as string;
    if (!instanceId) return;

    const holders = this.refHolders.get(instanceId);
    if (holders) {
      holders.delete(refId);
      if (holders.size === 0) {
        this.refHolders.delete(instanceId);
      }
    }

    if (this.instanceCache.has(instanceId)) {
      this.emitConsumersChanged(instanceId);
    }
  }

  subscribe(callback: DevToolsCallback): () => void {
    this.listeners.add(callback);

    // Immediately emit current full state so late subscribers get all data
    const instances = Array.from(this.instanceCache.values());
    if (instances.length > 0) {
      try {
        callback({
          type: 'init',
          timestamp: Date.now(),
          data: instances,
        });
      } catch (error) {
        console.error(
          '[DevToolsBrowserPlugin] Error in initial subscriber callback:',
          error,
        );
      }
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  getInstances(): InstanceMetadata[] {
    return Array.from(this.instanceCache.values()).map((inst) => {
      const consumers = this.consumers.get(inst.id);
      const refIds = this.context?.getRefIds(inst.id) ?? [];
      const refHolders = this.getRefHoldersForInstance(inst.id);
      return {
        ...inst,
        ...(consumers && consumers.size > 0
          ? { consumers: Array.from(consumers.values()) }
          : {}),
        ...(refIds.length > 0 ? { refIds } : {}),
        ...(refHolders.length > 0 ? { refHolders } : {}),
      } as any;
    });
  }

  getEventHistory(): DevToolsEvent[] {
    if (this.eventHistoryCount === 0) return [];
    if (this.eventHistoryCount < this.MAX_HISTORY_SIZE) {
      return [...this.eventHistoryBuffer];
    }
    // Ring buffer: return in order from head
    return [
      ...this.eventHistoryBuffer.slice(this.eventHistoryHead),
      ...this.eventHistoryBuffer.slice(0, this.eventHistoryHead),
    ];
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
      edges: Array.from(this.dependencyEdgesByFrom.values()).flat(),
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
          } else {
            return false;
          }
          return true;
        }
      }
    }
    return false;
  }

  registerConsumer(
    instanceId: string,
    consumerId: string,
    componentName: string,
  ): void {
    if (!this.instanceCache.has(instanceId)) return;

    let stackTrace: string | undefined;
    try {
      stackTrace = new Error().stack;
    } catch {
      /* ignore */
    }

    let instanceConsumers = this.consumers.get(instanceId);
    if (!instanceConsumers) {
      instanceConsumers = new Map();
      this.consumers.set(instanceId, instanceConsumers);
    }

    const info: ConsumerInfo = {
      id: consumerId,
      componentName,
      mountedAt: Date.now(),
      stackTrace,
    };
    instanceConsumers.set(consumerId, info);

    this.emitConsumersChanged(instanceId);
  }

  unregisterConsumer(instanceId: string, consumerId: string): void {
    const instanceConsumers = this.consumers.get(instanceId);
    if (!instanceConsumers) return;

    instanceConsumers.delete(consumerId);
    if (instanceConsumers.size === 0) {
      this.consumers.delete(instanceId);
    }

    this.emitConsumersChanged(instanceId);
  }

  getConsumers(
    instanceId?: string,
  ): ConsumerInfo[] | Record<string, ConsumerInfo[]> {
    if (instanceId) {
      const map = this.consumers.get(instanceId);
      return map ? Array.from(map.values()) : [];
    }
    const result: Record<string, ConsumerInfo[]> = {};
    for (const [id, map] of this.consumers) {
      result[id] = Array.from(map.values());
    }
    return result;
  }

  getRefIds(instanceId: string): string[] {
    return this.context?.getRefIds(instanceId) ?? [];
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
          getters: (data as any).getters,
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

  private getRefHoldersForInstance(instanceId: string): RefHolderInfo[] {
    const holders = this.refHolders.get(instanceId);
    return holders ? Array.from(holders.values()) : [];
  }

  private emitConsumersChanged(instanceId: string): void {
    const instanceConsumers = this.consumers.get(instanceId);
    this.emit({
      type: 'consumers-changed',
      timestamp: Date.now(),
      data: {
        instanceId,
        consumers: instanceConsumers
          ? Array.from(instanceConsumers.values())
          : [],
        refIds: this.context?.getRefIds(instanceId) ?? [],
        refHolders: this.getRefHoldersForInstance(instanceId),
      },
    });
  }

  private emit(event: DevToolsEvent): void {
    if (this.eventHistoryCount < this.MAX_HISTORY_SIZE) {
      this.eventHistoryBuffer.push(event);
      this.eventHistoryCount++;
    } else {
      const idx =
        (this.eventHistoryHead + this.eventHistoryCount) %
        this.MAX_HISTORY_SIZE;
      this.eventHistoryBuffer[idx] = event;
      this.eventHistoryHead =
        (this.eventHistoryHead + 1) % this.MAX_HISTORY_SIZE;
    }

    this.broadcastToExtension({ type: 'ATOMIC_UPDATE', payload: event });

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

    const getters = enumerateGetters(instance);

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
      ...(getters ? { getters } : {}),
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
  private captureCallstack(): string | undefined {
    if ((globalThis as any).process?.env?.NODE_ENV === 'production') {
      return undefined;
    }
    try {
      const error = new Error();
      const stack = error.stack || '';
      const lines = stack.split('\n');
      const relevantLines = lines.slice(1);
      const formattedLines: string[] = [];

      for (const line of relevantLines) {
        if (!line.trim()) continue;

        if (
          line.includes('DevToolsBrowserPlugin') ||
          line.includes('PluginManager') ||
          line.includes('StateContainer.emit') ||
          line.includes('[blac.emit]') ||
          line.includes('Cubit.patch') ||
          line.includes('/blac-core/dist/') ||
          line.includes('@blac/core/') ||
          line.includes('/blac-react/dist/') ||
          line.includes('@blac/react/') ||
          line.includes('/devtools-connect/dist/') ||
          line.includes('@blac/devtools-connect/')
        ) {
          continue;
        }

        if (
          line.includes('node_modules') ||
          line.includes('react-dom') ||
          line.includes('react_jsx') ||
          line.includes('.vite/deps') ||
          line.includes('executeDispatch') ||
          line.includes('runWithFiber') ||
          line.includes('invokeGuarded') ||
          line.includes('callCallback') ||
          line.includes('processDispatchQueue') ||
          line.includes('dispatchEvent') ||
          line.includes('batchedUpdates')
        ) {
          continue;
        }

        const formatted = this.formatStackLine(line);
        if (formatted) {
          formattedLines.push(formatted);
        }
      }

      return formattedLines.length > 0 ? formattedLines.join('\n') : undefined;
    } catch {
      return undefined;
    }
  }

  private formatStackLine(line: string): string | null {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (!match) {
      const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
      if (simpleMatch) {
        const [, url, lineNum, col] = simpleMatch;
        return `  at ${url}:${lineNum}:${col}`;
      }
      return null;
    }

    const [, functionName, url, lineNum, col] = match;
    return `  at ${functionName} (${url}:${lineNum}:${col})`;
  }

  private extractTriggerFromCallstack(callstack?: string): Trigger | undefined {
    if (!callstack) return undefined;
    const firstLine = callstack.split('\n')[0]?.trim();
    if (!firstLine) return undefined;
    const match = firstLine.match(/at\s+(\S+)\s+\(/);
    if (!match?.[1]) return undefined;
    const raw = match[1];
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

      // Replace edges for this instance
      const newEdges: DependencyEdge[] = [];
      for (const [TypeClass, instanceKey] of deps) {
        const toClass =
          (TypeClass as any as Record<string, any>).name ??
          (TypeClass as any).toString();
        newEdges.push({
          fromId: instanceId,
          fromClass: className,
          toClass,
          toKey: instanceKey,
        });
      }
      this.dependencyEdgesByFrom.set(instanceId, newEdges);
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

    // Max burst rate (peak in any 1s window) — sliding window O(n)
    let maxBurstRate = 0;
    if (allTimestamps.length > 0) {
      let left = 0;
      for (let right = 0; right < allTimestamps.length; right++) {
        while (allTimestamps[right] - allTimestamps[left] >= 1000) {
          left++;
        }
        const count = right - left + 1;
        if (count > maxBurstRate) maxBurstRate = count;
      }
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

  private broadcastToExtension(data: Record<string, any>): void {
    if (typeof window === 'undefined') return;
    window.postMessage(
      { source: 'blac-devtools-plugin', ...data },
      window.location.origin,
    );
  }

  private toExtensionInstances(): any[] {
    const { instances } = this.stateManager.getFullState();
    return instances.map((inst) => {
      const history = inst.history ?? [];
      const lastChange =
        history.length > 0 ? history[history.length - 1] : null;
      const instanceConsumers = this.consumers.get(inst.id);
      const instanceEdges = this.dependencyEdgesByFrom.get(inst.id) ?? [];
      const refIds = this.context?.getRefIds(inst.id) ?? [];
      const refHolders = this.getRefHoldersForInstance(inst.id);
      return {
        id: inst.id,
        className: inst.className,
        name: inst.name,
        isDisposed: false,
        isIsolated: false,
        state: inst.currentState,
        lastStateChangeTimestamp: lastChange?.timestamp ?? inst.createdAt,
        createdAt: inst.createdAt,
        getters: inst.getters,
        history: inst.history,
        createdFrom: inst.createdFrom,
        dependencies: instanceEdges.length ? instanceEdges : undefined,
        consumers: instanceConsumers
          ? Array.from(instanceConsumers.values())
          : undefined,
        refIds: refIds.length > 0 ? refIds : undefined,
        refHolders: refHolders.length > 0 ? refHolders : undefined,
      };
    });
  }

  private broadcastFullState(): void {
    if (typeof window === 'undefined') return;
    this.broadcastToExtension({
      type: 'INITIAL_STATE',
      payload: {
        instances: this.toExtensionInstances(),
        eventHistory: this.getEventHistory(),
        version: this.getVersion(),
        timestamp: Date.now(),
        dependencyGraph: this.getDependencyGraph(),
        sessionId: this.sessionId,
      },
    });
  }

  private startExtensionBridge(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('message', this.handleExtensionMessage);
    this.fullSyncTimer = setInterval(() => {
      if (this.extensionConnected) {
        this.broadcastFullState();
      }
    }, this.FULL_SYNC_INTERVAL);
  }

  private stopExtensionBridge(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleExtensionMessage);
    }
    if (this.fullSyncTimer !== undefined) {
      clearInterval(this.fullSyncTimer);
      this.fullSyncTimer = undefined;
    }
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
      registerConsumer: (
        instanceId: string,
        consumerId: string,
        componentName: string,
      ) => this.registerConsumer(instanceId, consumerId, componentName),
      unregisterConsumer: (instanceId: string, consumerId: string) =>
        this.unregisterConsumer(instanceId, consumerId),
      getConsumers: (instanceId?: string) => this.getConsumers(instanceId),
      getRefIds: (instanceId: string) => this.getRefIds(instanceId),
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
