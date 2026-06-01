/**
 * DevToolsBrowserPlugin - BlaC plugin for browser DevTools extension support
 *
 * Provides real-time instance inspection and state monitoring for the
 * BlaC DevTools browser extension using the new plugin API.
 *
 * Acts as the "backend" that stores complete state history and responds
 * to connection requests from DevTools panels.
 */

import { ALL_PATHS } from '@blac/core';
import type {
  BlacPlugin,
  PathSet,
  PluginContext,
  InstanceMetadata,
} from '@blac/core';
import { safeSerialize } from '../serialization/serialize';
import { enumerateGetters } from '../getters/enumerateGetters';
import { DevToolsStateManager } from '../state/DevToolsStateManager';
import type {
  DevToolsEvent,
  DevToolsCallback,
  DevToolsBrowserPluginConfig,
  Trigger,
  RefHolderInfo,
  ConsumerInfo,
} from '../types';

/**
 * Merge two decoded path sets for a coalesced update. `'all'` is absorbing.
 */
function mergePaths(
  a: string[] | 'all',
  b: string[] | 'all',
): string[] | 'all' {
  if (a === 'all' || b === 'all') return 'all';
  const set = new Set(a);
  for (const p of b) set.add(p);
  return Array.from(set);
}

interface PendingUpdate {
  instance: any;
  ctx: PluginContext;
  /** prev state captured at the first update of the coalesced batch */
  prev: any;
  /** next state from the most recent update of the batch */
  next: any;
  callstack?: string;
  trigger?: Trigger;
  /** union of changed paths across the batch */
  paths: string[] | 'all';
}

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

  // Ref holder tracking: instanceId -> Map<refId, RefHolderInfo>
  private refHolders = new Map<string, Map<string, RefHolderInfo>>();

  // Live container references, keyed by instanceId. Kept so the periodic full
  // sync and refs-changed emits can read each container's current consumer
  // watched-paths without a state change. Lifecycle mirrors instanceCache:
  // set on create/scan/update, deleted on destroy, cleared on dispose.
  private liveContainers = new Map<string, any>();

  // Backpressure: coalesce per-instance state updates and flush at most once
  // per animation frame, so a high-frequency emitter cannot saturate the
  // devtools surface (or the host thread) with serialize/postMessage/render work.
  private pendingUpdates = new Map<string, PendingUpdate>();
  // requestAnimationFrame / setTimeout both return a numeric handle in the browser.
  private flushHandle: number | undefined;

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

  // Backstop only: atomic events (broadcast unconditionally from emit()) are the
  // primary real-time channel, so the full re-sync just reconciles anything
  // missed. Kept infrequent because it re-serializes every instance.
  private readonly FULL_SYNC_INTERVAL = 10000;
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
      ...config,
    };

    this.stateManager = new DevToolsStateManager({
      maxInstances: this.config.maxInstances,
      maxSnapshots: this.config.maxSnapshots,
    });
  }

  onInstall(ctx: PluginContext): void {
    this.context = ctx;
    if (!this.config.enabled) return;
    this.exposeGlobalAPI();
    this.scanExistingInstances();
    this.startExtensionBridge();
    this.broadcastFullState();
  }

  onUninstall(): void {
    this.stopExtensionBridge();
    this.cancelScheduledFlush();
    this.pendingUpdates.clear();
    this.listeners.clear();
    this.instanceCache.clear();
    this.instanceTimestamps.clear();
    this.eventHistoryBuffer = [];
    this.eventHistoryHead = 0;
    this.eventHistoryCount = 0;
    this.refHolders.clear();
    this.liveContainers.clear();

    if (typeof window !== 'undefined') {
      delete (window as any as Record<string, any>).__BLAC_DEVTOOLS__;
    }
  }

  onCreated(ctx: PluginContext): void {
    if (!this.config.enabled) return;
    const instance = ctx.container;
    if (!instance) return;
    if (this.shouldExcludeInstance(instance)) return;

    const now = Date.now();
    const createdFrom = this.captureCallstack();
    const data = this.createInstanceData(instance, ctx);
    this.instanceCache.set(data.id, data);
    this.liveContainers.set(data.id, instance);

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

    const eventData = { ...data, createdFrom };
    this.emit({
      type: 'instance-created',
      timestamp: now,
      data: eventData,
    });
  }

  /**
   * Fires once per channel flush with the coalesced prev/next states and the
   * set of changed paths.
   *
   * Wire event shape (type: 'instance-updated') — consumed by F3 devtools-ui:
   * ```ts
   * {
   *   type: 'instance-updated';
   *   timestamp: number;
   *   data: {
   *     id: string;
   *     className: string;
   *     name: string;
   *     state: unknown;          // next (serialized)
   *     previousState: unknown;  // prev (serialized)
   *     currentState: unknown;   // next alias (serialized)
   *     paths: string[] | 'all'; // decoded path names; 'all' = ALL_PATHS
   *     trigger?: Trigger;
   *     consumers?: ConsumerInfo[]; // per-consumer watched paths (if any)
   *   }
   * }
   * ```
   *
   * `paths` encoding:
   *   - `'all'`    — PathSet was the ALL_PATHS sentinel; every path changed.
   *   - `string[]` — interned ids resolved to dotted-path strings via
   *                  `ctx.container.interner.lookup(id)`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interface requires generic; class impl uses any
  onStateChange(
    ctx: PluginContext,
    prev: any,
    next: any,
    paths: PathSet,
  ): void {
    if (!this.config.enabled) return;
    const instance = ctx.container;
    if (!instance) return;
    if (this.shouldExcludeInstance(instance)) return;

    const id = (instance as Record<string, any>).instanceId as string;
    if (!id) return;

    // Decode PathSet → wire-safe representation. A foreign/out-of-range id must
    // not throw and abort the whole update — degrade to 'all' instead.
    let decodedPaths: string[] | 'all';
    if (paths === ALL_PATHS) {
      decodedPaths = 'all';
    } else {
      try {
        // `lookup` decodes ancestor-watch ids back to their real path, so the
        // dirty set may map two ids (a normal mark and its ancestor-watch
        // sibling) onto the same string — dedup to the human-facing path list.
        decodedPaths = Array.from(
          new Set(
            Array.from(paths as Set<number>).map((pid) =>
              instance.interner.lookup(pid),
            ),
          ),
        );
      } catch {
        decodedPaths = 'all';
      }
    }

    // Callstack is debug-only; skip the expensive Error().stack parse entirely
    // when nothing is observing (plugin installed but devtools not open).
    const callstack = this.isObserved() ? this.captureCallstack() : undefined;
    const trigger = this.extractTriggerFromCallstack(callstack);

    // Coalesce bursts: keep the oldest `prev`, the newest `next`/callstack, and
    // the union of changed paths. The heavy work (serialize, getter
    // enumeration, emit/postMessage, listener fan-out) runs in the scheduled
    // flush, at most once per animation frame per instance.
    const existing = this.pendingUpdates.get(id);
    if (existing) {
      existing.next = next;
      existing.callstack = callstack;
      existing.trigger = trigger;
      existing.paths = mergePaths(existing.paths, decodedPaths);
    } else {
      this.pendingUpdates.set(id, {
        instance,
        ctx,
        prev,
        next,
        callstack,
        trigger,
        paths: decodedPaths,
      });
    }
    this.scheduleFlush();
  }

  /** True when an in-app overlay or the extension is actively listening. */
  private isObserved(): boolean {
    return this.listeners.size > 0 || this.extensionConnected;
  }

  private scheduleFlush(): void {
    if (this.flushHandle !== undefined) return;
    const run = () => {
      this.flushHandle = undefined;
      this.flushPendingUpdates();
    };
    this.flushHandle =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(run)
        : (setTimeout(run, 16) as unknown as number);
  }

  private cancelScheduledFlush(): void {
    if (this.flushHandle === undefined) return;
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.flushHandle);
    } else {
      clearTimeout(this.flushHandle);
    }
    this.flushHandle = undefined;
  }

  private flushPendingUpdates(): void {
    if (this.pendingUpdates.size === 0) return;
    const updates = Array.from(this.pendingUpdates.values());
    this.pendingUpdates.clear();
    for (const u of updates) {
      this.emitCoalescedUpdate(u);
    }
  }

  private emitCoalescedUpdate(u: PendingUpdate): void {
    const data = this.createInstanceData(
      u.instance,
      u.ctx,
      u.prev,
      u.next,
      u.callstack,
    );
    this.instanceCache.set(data.id, data);
    this.liveContainers.set(data.id, u.instance);

    // Reuse already-serialized states from createInstanceData
    this.stateManager.updateState(
      data.id,
      (data as any).previousState ?? u.prev,
      (data as any).currentState ?? u.next,
      u.callstack,
      u.trigger,
      (data as any).getters,
      u.paths,
    );

    this.emit({
      type: 'instance-updated',
      timestamp: Date.now(),
      data: { ...data, trigger: u.trigger, paths: u.paths },
    });
  }

  onDestroyed(ctx: PluginContext): void {
    if (!this.config.enabled) return;
    const instance = ctx.container;
    if (!instance) return;
    if (this.shouldExcludeInstance(instance)) return;

    const data = this.createInstanceData(instance, ctx);
    data.isDisposed = true;
    this.instanceCache.delete(data.id);
    this.liveContainers.delete(data.id);
    this.stateManager.removeInstance(data.id);

    // Drop any coalesced update still pending for this instance, and clean up
    // ref-holder tracking.
    this.pendingUpdates.delete(
      (instance as Record<string, any>).instanceId as string,
    );
    this.refHolders.delete(data.id);

    this.emit({
      type: 'instance-disposed',
      timestamp: Date.now(),
      data,
    });
  }

  onRefAcquired(ctx: PluginContext, refId: string): void {
    if (!this.config.enabled) return;
    const instance = ctx.container;
    if (!instance) return;
    if (this.shouldExcludeInstance(instance)) return;

    const instanceId = instance.instanceId as string;
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

    this.emitRefsChanged(instanceId);
  }

  onDepsChanged(
    ctx: PluginContext,
    previousDeps: Readonly<Record<string, unknown>>,
    currentDeps: Readonly<Record<string, unknown>>,
  ): void {
    if (!this.config.enabled) return;
    const instance = ctx.container;
    if (!instance) return;
    if (this.shouldExcludeInstance(instance)) return;

    const instanceId = instance.instanceId as string;
    if (!instanceId || !this.instanceCache.has(instanceId)) return;

    const prevSer = safeSerialize(previousDeps);
    const nextSer = safeSerialize(currentDeps);
    const data = this.instanceCache.get(instanceId);

    this.emit({
      type: 'deps-changed',
      timestamp: Date.now(),
      data: {
        id: instanceId,
        className: data?.className,
        name: data?.name,
        previousDeps: prevSer.success ? prevSer.data : undefined,
        currentDeps: nextSer.success ? nextSer.data : undefined,
      },
    });
  }

  onRefReleased(ctx: PluginContext, refId: string): void {
    if (!this.config.enabled) return;
    const instance = ctx.container;
    if (!instance) return;
    if (this.shouldExcludeInstance(instance)) return;

    const instanceId = instance.instanceId as string;
    if (!instanceId) return;

    const holders = this.refHolders.get(instanceId);
    if (holders) {
      holders.delete(refId);
      if (holders.size === 0) {
        this.refHolders.delete(instanceId);
      }
    }

    if (this.instanceCache.has(instanceId)) {
      this.emitRefsChanged(instanceId);
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
      const refIds = this.context?.getRefIds(inst.id) ?? [];
      const refHolders = this.getRefHoldersForInstance(inst.id);
      return {
        ...inst,
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
        this.liveContainers.set(data.id, instance);

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

  /**
   * Read a container's per-consumer watched paths and decode them to wire-safe
   * dotted strings. Returns `undefined` when the container doesn't expose the
   * registry (non-structural container) or has no registered consumers — so
   * the field is omitted rather than sent empty.
   *
   * Mirrors the PathSet → string[] decode used by `onStateChange`: a foreign
   * or out-of-range path id degrades that consumer to `'all'` instead of
   * throwing.
   */
  private decodeConsumers(instance: any): ConsumerInfo[] | undefined {
    const getPaths = instance?.getConsumerPaths;
    if (typeof getPaths !== 'function') return undefined;

    let map: Map<unknown, PathSet>;
    try {
      map = getPaths.call(instance);
    } catch {
      return undefined;
    }
    if (!map || typeof map.forEach !== 'function' || map.size === 0) {
      return undefined;
    }

    const consumers: ConsumerInfo[] = [];
    map.forEach((pathSet, rawId) => {
      const consumerId =
        typeof rawId === 'string' ? rawId : String(rawId as any);
      let paths: string[] | 'all';
      if (pathSet === ALL_PATHS) {
        paths = 'all';
      } else {
        try {
          paths = Array.from(pathSet as Set<number>).map((pid) =>
            instance.interner.lookup(pid),
          );
        } catch {
          paths = 'all';
        }
      }
      consumers.push({ consumerId, paths });
    });
    return consumers.length > 0 ? consumers : undefined;
  }

  private getConsumersForInstance(
    instanceId: string,
  ): ConsumerInfo[] | undefined {
    const container = this.liveContainers.get(instanceId);
    return container ? this.decodeConsumers(container) : undefined;
  }

  private emitRefsChanged(instanceId: string): void {
    const consumers = this.getConsumersForInstance(instanceId);
    this.emit({
      type: 'refs-changed',
      timestamp: Date.now(),
      data: {
        instanceId,
        refIds: this.context?.getRefIds(instanceId) ?? [],
        refHolders: this.getRefHoldersForInstance(instanceId),
        ...(consumers ? { consumers } : {}),
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

    // Always broadcast atomic events to the extension. This is a bare
    // window.postMessage — a no-op when no content script is listening — so the
    // cost when devtools is closed is negligible, and it removes the dependency
    // on the `extensionConnected` handshake flipping in time. Gating this was
    // the reason real-time updates (and the logs feed, which is built purely
    // from these events) only appeared via the periodic full-sync.
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
    const serializedArgs =
      metadata.args !== undefined ? safeSerialize(metadata.args) : undefined;

    const getters = enumerateGetters(instance);
    const consumers = this.decodeConsumers(instance);

    return {
      ...metadata,
      ...(consumers ? { consumers } : {}),
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
      args: serializedArgs
        ? serializedArgs.success
          ? serializedArgs.data
          : undefined
        : undefined,
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
      const refIds = this.context?.getRefIds(inst.id) ?? [];
      const refHolders = this.getRefHoldersForInstance(inst.id);
      const consumers = this.getConsumersForInstance(inst.id);
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
        refIds: refIds.length > 0 ? refIds : undefined,
        refHolders: refHolders.length > 0 ? refHolders : undefined,
        consumers,
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
