import type {
  HydrationStatus,
  StateContainer,
} from '../core/StateContainer';

/**
 * Metadata information about a state container instance for debugging and inspection
 */
export interface InstanceMetadata {
  /** Unique instance identifier */
  id: string;
  /** Name of the state container class */
  className: string;
  /** Whether the instance has been disposed */
  isDisposed: boolean;
  /** Display name for the instance */
  name: string;
  /** When state last changed (milliseconds) */
  lastStateChangeTimestamp: number;
  /** Current state value */
  state: any;
  /** Timestamp when instance was created (milliseconds) */
  createdAt: number;
  /** Stack trace from when instance was created (for debugging) */
  callstack?: string;
  /** Previous state value */
  previousState?: any;
  /** Current state value */
  currentState?: any;
  /** Current hydration status */
  hydrationStatus: HydrationStatus;
  /** Whether hydration completed successfully */
  isHydrated: boolean;
  /** Hydration error, if present */
  hydrationError?: Error;
  /** Whether state changed while hydration was pending */
  changedWhileHydrating: boolean;
}

/**
 * Safe context API provided to plugins for accessing registry data
 */
export interface PluginContext {
  /**
   * Get metadata for a specific instance
   */
  getInstanceMetadata(instance: StateContainer<any>): InstanceMetadata;

  /**
   * Get current state from a container
   */
  getState<S extends object = any>(instance: StateContainer<S>): S;

  /**
   * Get hydration status from a container
   */
  getHydrationStatus(instance: StateContainer<any>): HydrationStatus;

  /**
   * Mark a container as hydrating
   */
  startHydration(instance: StateContainer<any>): void;

  /**
   * Apply hydrated state if the container has not been mutated while hydrating
   * @returns true when the state was applied
   */
  applyHydratedState<S extends object = any>(
    instance: StateContainer<S>,
    state: S,
  ): boolean;

  /**
   * Mark hydration as finished
   */
  finishHydration(instance: StateContainer<any>): void;

  /**
   * Mark hydration as failed
   */
  failHydration(instance: StateContainer<any>, error: Error): void;

  /**
   * Wait for hydration to settle
   */
  waitForHydration(instance: StateContainer<any>): Promise<void>;

  /**
   * Get all instances of a specific type
   */
  queryInstances<T extends StateContainer<any>>(
    typeClass: new (...args: any[]) => T,
  ): T[];

  /**
   * Get all registered state container types
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
 * Interface for plugins that extend BlaC functionality
 */
export interface BlacPlugin {
  /** Unique plugin identifier */
  readonly name: string;
  /** Plugin version identifier */
  readonly version: string;

  /**
   * Called when the plugin is installed (optional)
   */
  onInstall?(context: PluginContext): void;

  /**
   * Called when the plugin is uninstalled
   */
  onUninstall?(): void;

  /**
   * Called when a state container instance is created
   */
  onInstanceCreated?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;

  /**
   * Called when state changes in a container instance
   */
  onStateChanged?<S extends object = any>(
    instance: StateContainer<S>,
    previousState: S,
    currentState: S,
    callstack: string | undefined,
    context: PluginContext,
  ): void;

  /**
   * Called when a state container instance is disposed
   */
  onInstanceDisposed?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;
}

/**
 * Plugin interface variant that requires mandatory onInstall hook
 */
export interface BlacPluginWithInit extends BlacPlugin {
  /**
   * Required initialization hook called when plugin is installed
   */
  onInstall(context: PluginContext): void;
}

/**
 * Configuration options for plugin installation
 */
export interface PluginConfig {
  /** Enable or disable the plugin */
  enabled?: boolean;
  /** Environments where plugin runs */
  environment?: 'development' | 'production' | 'test' | 'all';
}

/**
 * Type guard to check if a plugin has a required onInstall hook
 * @param plugin - The plugin to check
 * @returns true if the plugin implements BlacPluginWithInit
 */
export function hasInitHook(plugin: BlacPlugin): plugin is BlacPluginWithInit {
  return typeof plugin.onInstall === 'function';
}
