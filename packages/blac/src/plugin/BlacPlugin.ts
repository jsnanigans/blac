/**
 * BlacPlugin - Plugin system for BlaC state management
 *
 * Provides a safe and powerful API for plugins to observe and interact with
 * StateContainer instances without coupling to the core.
 */

import type { StateContainer } from '../core/StateContainer';
import type { Vertex } from '../core/Vertex';

/**
 * Instance metadata exposed to plugins
 */
export interface InstanceMetadata {
  /** Unique instance ID */
  id: string;
  /** Class name (e.g., 'CounterCubit') */
  className: string;
  /** Instance key for shared instances */
  instanceKey: string;
  /** Reference count (0 for isolated instances) */
  refCount: number;
  /** Whether instance is disposed */
  isDisposed: boolean;
  /** Custom name if provided */
  name: string;
}

/**
 * Plugin context - provides safe access to BlaC internals
 */
export interface PluginContext {
  /**
   * Get metadata for an instance
   */
  getInstanceMetadata(instance: StateContainer<any>): InstanceMetadata;

  /**
   * Get current state of an instance
   */
  getState<S>(instance: StateContainer<S>): S;

  /**
   * Query all instances of a specific type
   */
  queryInstances<T extends StateContainer<any>>(
    typeClass: new (...args: any[]) => T
  ): T[];

  /**
   * Query all registered types
   */
  getAllTypes(): Array<new (...args: any[]) => StateContainer<any>>;

  /**
   * Get registry statistics
   */
  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  };
}

/**
 * Base plugin interface
 */
export interface BlacPlugin {
  /** Plugin name for identification */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /**
   * Called when plugin is installed
   * @param context - Plugin context for safe access to BlaC internals
   */
  onInstall?(context: PluginContext): void;

  /**
   * Called when plugin is uninstalled
   */
  onUninstall?(): void;

  /**
   * Called when a StateContainer instance is created
   */
  onInstanceCreated?(instance: StateContainer<any>, context: PluginContext): void;

  /**
   * Called when state changes
   */
  onStateChanged?<S>(
    instance: StateContainer<S>,
    previousState: S,
    currentState: S,
    context: PluginContext
  ): void;

  /**
   * Called when an event is added (Vertex only)
   */
  onEventAdded?<E>(
    vertex: Vertex<any, E>,
    event: E,
    context: PluginContext
  ): void;

  /**
   * Called when an instance is disposed
   */
  onInstanceDisposed?(instance: StateContainer<any>, context: PluginContext): void;
}

/**
 * Plugin with initialization hook
 */
export interface BlacPluginWithInit extends BlacPlugin {
  onInstall(context: PluginContext): void;
}

/**
 * Plugin configuration options
 */
export interface PluginConfig {
  /** Whether plugin is enabled */
  enabled?: boolean;

  /** Environment filter (e.g., only run in development) */
  environment?: 'development' | 'production' | 'test' | 'all';
}

/**
 * Type guard for plugins with init
 */
export function hasInitHook(plugin: BlacPlugin): plugin is BlacPluginWithInit {
  return typeof plugin.onInstall === 'function';
}