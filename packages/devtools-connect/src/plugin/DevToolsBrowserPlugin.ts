/**
 * DevToolsBrowserPlugin - BlaC plugin for browser DevTools extension support
 *
 * Provides real-time instance inspection and state monitoring for the
 * BlaC DevTools browser extension using the new plugin API.
 */

import type {
  BlacPlugin,
  PluginContext,
  InstanceMetadata,
} from '@blac/core';
import { safeSerialize } from '../serialization/serialize';

/**
 * Instance data structure for DevTools (with serialized state)
 */
export interface DevToolsInstanceData extends InstanceMetadata {
  state: any; // Serialized state
  createdAt: number;
}

/**
 * Event types for DevTools
 */
export type DevToolsEventType =
  | 'instance-created'
  | 'instance-updated'
  | 'instance-disposed';

export interface DevToolsEvent {
  type: DevToolsEventType;
  timestamp: number;
  data: DevToolsInstanceData;
}

/**
 * Callback type for DevTools subscriptions
 */
export type DevToolsCallback = (event: DevToolsEvent) => void;

/**
 * Configuration for DevTools browser plugin
 */
export interface DevToolsBrowserPluginConfig {
  /** Enable/disable the plugin */
  enabled?: boolean;
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
  private instanceCache = new Map<string, DevToolsInstanceData>();
  private context?: PluginContext;
  private config: Required<DevToolsBrowserPluginConfig>;
  private instanceTimestamps = new Map<string, number>();

  constructor(config: DevToolsBrowserPluginConfig = {}) {
    this.config = {
      enabled: true,
      ...config,
    };
  }

  /**
   * Called when plugin is installed
   */
  onInstall(context: PluginContext): void {
    console.log('[DevToolsBrowserPlugin] Installed');
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
    console.log('[DevToolsBrowserPlugin] Uninstalled');
    this.listeners.clear();
    this.instanceCache.clear();
    this.instanceTimestamps.clear();

    // Remove global API
    if (typeof window !== 'undefined') {
      delete (window as any).__BLAC_DEVTOOLS__;
    }
  }

  /**
   * Called when instance is created
   */
  onInstanceCreated(instance: any, context: PluginContext): void {
    const data = this.createInstanceData(instance, context);
    this.instanceCache.set(data.id, data);

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
    context: PluginContext
  ): void {
    const data = this.createInstanceData(instance, context);
    this.instanceCache.set(data.id, data);

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
    const data = this.createInstanceData(instance, context);
    data.isDisposed = true;
    this.instanceCache.delete(data.id);

    this.emit({
      type: 'instance-disposed',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Subscribe to DevTools events
   */
  subscribe(callback: DevToolsCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get all current instances
   */
  getInstances(): DevToolsInstanceData[] {
    return Array.from(this.instanceCache.values());
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
        const data = this.createInstanceData(instance, this.context);
        this.instanceCache.set(data.id, data);
      }
    }

    console.log(
      `[DevToolsBrowserPlugin] Found ${this.instanceCache.size} existing instances`
    );
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: DevToolsEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[DevToolsBrowserPlugin] Listener error:', error);
      }
    });
  }

  /**
   * Create instance data from a StateContainer
   */
  private createInstanceData(
    instance: any,
    context: PluginContext
  ): DevToolsInstanceData {
    const metadata = context.getInstanceMetadata(instance);
    const state = context.getState(instance);

    // Track creation time
    if (!this.instanceTimestamps.has(metadata.id)) {
      this.instanceTimestamps.set(metadata.id, Date.now());
    }

    return {
      ...metadata,
      state: safeSerialize(state).data,
      createdAt: this.instanceTimestamps.get(metadata.id) || Date.now(),
    };
  }

  /**
   * Expose global API for browser extension
   */
  private exposeGlobalAPI(): void {
    if (typeof window === 'undefined') return;

    (window as any).__BLAC_DEVTOOLS__ = {
      getInstances: () => this.getInstances(),
      subscribe: (callback: DevToolsCallback) => this.subscribe(callback),
      getVersion: () => this.getVersion(),
      isEnabled: () => this.enabled,
    };

    console.log(
      '%c[BlaC DevTools] API exposed at window.__BLAC_DEVTOOLS__',
      'color: #4CAF50; font-weight: bold'
    );
  }
}

/**
 * Create and configure DevTools browser plugin
 */
export function createDevToolsBrowserPlugin(
  config?: DevToolsBrowserPluginConfig
): DevToolsBrowserPlugin {
  return new DevToolsBrowserPlugin(config);
}