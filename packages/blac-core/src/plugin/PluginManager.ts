import type { StateContainer } from '../core/StateContainer';
import type { StateContainerRegistry } from '../core/StateContainerRegistry';
import type {
  BlacPlugin,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './BlacPlugin';

/**
 * Internal structure for tracking installed plugins
 * @internal
 */
interface InstalledPlugin {
  plugin: BlacPlugin;
  config: PluginConfig;
  context: PluginContext;
}

/**
 * Manages plugin lifecycle for the BlaC state management system.
 * Plugins receive notifications about state container lifecycle events.
 *
 * @example
 * ```ts
 * const manager = createPluginManager(registry);
 * manager.install(myPlugin, { environment: 'development' });
 * ```
 */
export class PluginManager {
  private plugins = new Map<string, InstalledPlugin>();
  private registry: StateContainerRegistry;

  /**
   * Create a new PluginManager
   * @param registry - The StateContainerRegistry to monitor for lifecycle events
   */
  constructor(registry: StateContainerRegistry) {
    this.registry = registry;
    this.setupLifecycleHooks();
  }

  /**
   * Install a plugin with optional configuration
   * @param plugin - The plugin to install
   * @param config - Optional plugin configuration
   * @throws Error if plugin is already installed
   */
  install(plugin: BlacPlugin, config: PluginConfig = {}): void {
    const effectiveConfig: PluginConfig = {
      enabled: true,
      environment: 'all',
      ...config,
    };

    if (!this.shouldEnablePlugin(effectiveConfig)) {
      console.log(
        `[BlaC] Plugin "${plugin.name}" skipped (environment mismatch)`,
      );
      return;
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed`);
    }

    const context = this.createPluginContext();

    this.plugins.set(plugin.name, {
      plugin,
      config: effectiveConfig,
      context,
    });

    if (plugin.onInstall) {
      try {
        plugin.onInstall(context);
      } catch (error) {
        console.error(
          `[BlaC] Error installing plugin "${plugin.name}":`,
          error,
        );
        this.plugins.delete(plugin.name);
        throw error;
      }
    }

    console.log(`[BlaC] Plugin "${plugin.name}" v${plugin.version} installed`);
  }

  /**
   * Uninstall a plugin by name
   * @param pluginName - The name of the plugin to uninstall
   * @throws Error if plugin is not installed
   */
  uninstall(pluginName: string): void {
    const installed = this.plugins.get(pluginName);
    if (!installed) {
      throw new Error(`Plugin "${pluginName}" is not installed`);
    }

    if (installed.plugin.onUninstall) {
      try {
        installed.plugin.onUninstall();
      } catch (error) {
        console.error(
          `[BlaC] Error uninstalling plugin "${pluginName}":`,
          error,
        );
      }
    }

    this.plugins.delete(pluginName);
    console.log(`[BlaC] Plugin "${pluginName}" uninstalled`);
  }

  /**
   * Get an installed plugin by name
   * @param pluginName - The name of the plugin to retrieve
   * @returns The plugin instance or undefined if not found
   */
  getPlugin(pluginName: string): BlacPlugin | undefined {
    return this.plugins.get(pluginName)?.plugin;
  }

  /**
   * Get all installed plugins
   * @returns Array of all installed plugins
   */
  getAllPlugins(): BlacPlugin[] {
    return Array.from(this.plugins.values()).map((p) => p.plugin);
  }

  /**
   * Check if a plugin is installed
   * @param pluginName - The name of the plugin to check
   * @returns true if the plugin is installed
   */
  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Uninstall all plugins
   */
  clear(): void {
    for (const name of this.plugins.keys()) {
      this.uninstall(name);
    }
  }

  /**
   * Setup lifecycle hooks to notify plugins
   */
  private setupLifecycleHooks(): void {
    // Instance created
    this.registry.on('created', (instance) => {
      this.notifyPlugins('onInstanceCreated', instance);
    });

    // State changed
    this.registry.on(
      'stateChanged',
      (instance, previousState, currentState, callstack) => {
        this.notifyPlugins(
          'onStateChanged',
          instance,
          previousState,
          currentState,
          callstack,
        );
      },
    );

    // Instance disposed
    this.registry.on('disposed', (instance) => {
      this.notifyPlugins('onInstanceDisposed', instance);
    });
  }

  /**
   * Notify all plugins of a lifecycle event
   */
  private notifyPlugins(hookName: keyof BlacPlugin, ...args: any[]): void {
    for (const { plugin, config, context } of this.plugins.values()) {
      if (!config.enabled) continue;

      const hook = plugin[hookName];
      if (typeof hook === 'function') {
        try {
          (hook as any).apply(plugin, [...args, context]);
        } catch (error) {
          console.error(
            `[BlaC] Error in plugin "${plugin.name}" ${hookName}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Create plugin context with safe API access
   */
  private createPluginContext(): PluginContext {
    return {
      getInstanceMetadata: (
        instance: StateContainer<any>,
      ): InstanceMetadata => {
        return {
          id: instance.instanceId,
          className: instance.constructor.name,
          isDisposed: instance.isDisposed,
          name: instance.name,
          lastStateChangeTimestamp: instance.lastUpdateTimestamp,
          createdAt: instance.createdAt,
          state: instance.state,
          isIsolated: instance.instanceId.startsWith('isolated-'),
        };
      },

      getState: <S extends object = any>(instance: StateContainer<S>): S => {
        return instance.state;
      },

      queryInstances: <T extends StateContainer<any>>(
        typeClass: new (...args: any[]) => T,
      ): T[] => {
        return this.registry.getAll(typeClass as any);
      },

      getAllTypes: () => {
        return this.registry.getTypes();
      },

      getStats: () => {
        return this.registry.getStats();
      },
    };
  }

  /**
   * Check if plugin should be enabled based on environment
   */
  private shouldEnablePlugin(config: PluginConfig): boolean {
    if (!config.enabled) return false;
    if (config.environment === 'all') return true;

    const currentEnv = this.getCurrentEnvironment();
    return currentEnv === config.environment;
  }

  /**
   * Get current environment
   */
  private getCurrentEnvironment(): 'development' | 'production' | 'test' {
    if (typeof process !== 'undefined') {
      if (process.env.NODE_ENV === 'test') return 'test';
      if (process.env.NODE_ENV === 'production') return 'production';
      return 'development';
    }
    return 'development';
  }
}

/**
 * Create a plugin manager instance
 * @param registry - The StateContainerRegistry to monitor for lifecycle events
 * @returns A new PluginManager instance
 */
export function createPluginManager(
  registry: StateContainerRegistry,
): PluginManager {
  return new PluginManager(registry);
}
