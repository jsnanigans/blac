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
  InstanceState,
  DevToolsEventType,
  DevToolsEvent,
  DevToolsCallback,
  DevToolsBrowserPluginConfig,
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

  // Persistent event history storage (complete log from app startup)
  private eventHistory: DevToolsEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 10000; // Store up to 10k events

  // State manager for structured state history (backend for DevTools panels)
  private stateManager: DevToolsStateManager;

  constructor(config: DevToolsBrowserPluginConfig = {}) {
    this.config = {
      enabled: true,
      maxInstances: 2000,
      maxSnapshots: 20,
      ...config,
    };

    // Initialize state manager
    this.stateManager = new DevToolsStateManager({
      maxInstances: this.config.maxInstances,
      maxSnapshots: this.config.maxSnapshots,
    });
  }

  /**
   * Called when plugin is installed
   */
  onInstall(context: PluginContext): void {
    this.context = context;

    // Scan for existing instances
    this.scanExistingInstances();

    // Expose global API in browser
    this.exposeGlobalAPI();
  }

  /**
   * Called when plugin is uninstalled
   */
  onUninstall(): void {
    this.listeners.clear();
    this.instanceCache.clear();
    this.instanceTimestamps.clear();
    this.eventHistory = [];

    // Remove global API
    if (typeof window !== 'undefined') {
      delete (window as any).__BLAC_DEVTOOLS__;
    }
  }

  /**
   * Called when instance is created
   */
  onInstanceCreated(instance: any, context: PluginContext): void {
    // Skip instances marked as internal (DevTools Blocs tracking themselves)
    if (this.shouldExcludeInstance(instance)) {
      return;
    }

    const data = this.createInstanceData(instance, context);
    this.instanceCache.set(data.id, data);

    // Add to state manager
    const createdAt = Date.now();
    this.instanceTimestamps.set(data.id, createdAt);
    this.stateManager.addInstance({
      id: data.id,
      className: data.className,
      name: data.name || data.id,
      state: data.state,
      createdAt,
    });

    this.emit({
      type: 'instance-created',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Called when state changes
   */
  onStateChanged(
    instance: any,
    previousState: any,
    currentState: any,
    callstack: string | undefined,
    context: PluginContext,
  ): void {
    // Skip instances marked as internal (DevTools Blocs tracking themselves)
    if (this.shouldExcludeInstance(instance)) {
      return;
    }

    const data = this.createInstanceData(
      instance,
      context,
      previousState,
      currentState,
      callstack,
    );
    this.instanceCache.set(data.id, data);

    // Update state manager with history
    this.stateManager.updateState(
      data.id,
      safeSerialize(previousState).data,
      safeSerialize(currentState).data,
      callstack,
    );

    this.emit({
      type: 'instance-updated',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Called when instance is disposed
   */
  onInstanceDisposed(instance: any, context: PluginContext): void {
    // Skip instances marked as internal (DevTools Blocs tracking themselves)
    if (this.shouldExcludeInstance(instance)) {
      return;
    }

    const data = this.createInstanceData(instance, context);
    data.isDisposed = true;
    this.instanceCache.delete(data.id);

    // Remove from state manager
    this.stateManager.removeInstance(data.id);

    this.emit({
      type: 'instance-disposed',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Subscribe to DevTools events (real-time events only, not history)
   */
  subscribe(callback: DevToolsCallback): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get all current instances
   */
  getInstances(): InstanceMetadata[] {
    return Array.from(this.instanceCache.values());
  }

  /**
   * Get complete event history from app startup
   * This allows DevTools to request the full log when it opens
   */
  getEventHistory(): DevToolsEvent[] {
    return [...this.eventHistory]; // Return copy to prevent external mutation
  }

  /**
   * Get full state dump with complete history (new backend API)
   * This provides structured state with 20 snapshots per instance
   */
  getFullState(): { instances: InstanceState[]; timestamp: number } {
    return this.stateManager.getFullState();
  }

  /**
   * Get version information
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Check if plugin is enabled
   */
  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Scan for existing instances on install
   */
  private scanExistingInstances(): void {
    if (!this.context) return;

    const types = this.context.getAllTypes();
    for (const TypeClass of types) {
      const instances = this.context.queryInstances(TypeClass);
      for (const instance of instances) {
        // Skip instances marked as internal (DevTools Blocs tracking themselves)
        if (this.shouldExcludeInstance(instance)) {
          continue;
        }

        const data = this.createInstanceData(instance, this.context);
        this.instanceCache.set(data.id, data);

        // Add to state manager
        const createdAt = Date.now();
        this.instanceTimestamps.set(data.id, createdAt);
        this.stateManager.addInstance({
          id: data.id,
          className: data.className,
          name: data.name || data.id,
          state: data.state,
          createdAt,
        });
      }
    }

    // Emit INIT event with all instances
    const allInstances = Array.from(this.instanceCache.values());
    this.emit({
      type: 'init',
      timestamp: Date.now(),
      data: allInstances,
    });
  }

  /**
   * Emit event to all listeners AND store in persistent history
   */
  private emit(event: DevToolsEvent): void {
    // Always store event in history (persistent log from app startup)
    if (this.eventHistory.length < this.MAX_HISTORY_SIZE) {
      this.eventHistory.push(event);
    } else {
      // Remove oldest event when history is full (FIFO)
      this.eventHistory.shift();
      this.eventHistory.push(event);
    }

    // Also emit to all current real-time listeners
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

  /**
   * Create instance data from a StateContainer
   */
  private createInstanceData(
    instance: any,
    context: PluginContext,
    previousState?: any,
    currentState?: any,
    callstack?: string,
  ): InstanceMetadata {
    const metadata = context.getInstanceMetadata(instance);
    const state = context.getState(instance);

    // Track creation time
    if (!this.instanceTimestamps.has(metadata.id)) {
      this.instanceTimestamps.set(metadata.id, Date.now());
    }

    return {
      ...metadata,
      state: safeSerialize(state).data,
      callstack,
      previousState: previousState
        ? safeSerialize(previousState).data
        : undefined,
      currentState: currentState ? safeSerialize(currentState).data : undefined,
      hydrationStatus: context.getHydrationStatus(instance),
      hydrationError: metadata.hydrationError,
    };
  }

  /**
   * Check if an instance should be excluded from DevTools tracking
   */
  private shouldExcludeInstance(instance: any): boolean {
    // Check if the instance's constructor has __excludeFromDevTools set to true
    const constructor = instance.constructor;
    return constructor.__excludeFromDevTools === true;
  }

  /**
   * Restore a specific instance to a given state (time-travel)
   * Works with Cubit (emit) and Bloc (update)
   */
  timeTravel(instanceId: string, state: unknown): boolean {
    if (!this.context) return false;

    const types = this.context.getAllTypes();
    for (const TypeClass of types) {
      const instances = this.context.queryInstances(TypeClass);
      for (const instance of instances) {
        const metadata = this.context.getInstanceMetadata(instance);
        if (metadata.id === instanceId) {
          if (typeof (instance as any).emit === 'function') {
            (instance as any).emit(state);
          } else if (typeof (instance as any).update === 'function') {
            (instance as any).update(() => state);
          } else {
            return false;
          }
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Expose global API for browser extension
   */
  private exposeGlobalAPI(): void {
    if (typeof window === 'undefined') return;

    (window as any).__BLAC_DEVTOOLS__ = {
      getInstances: () => this.getInstances(),
      getEventHistory: () => this.getEventHistory(),
      getFullState: () => this.getFullState(),
      subscribe: (callback: DevToolsCallback) => this.subscribe(callback),
      getVersion: () => this.getVersion(),
      isEnabled: () => this.enabled,
      timeTravel: (instanceId: string, state: unknown) =>
        this.timeTravel(instanceId, state),
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
