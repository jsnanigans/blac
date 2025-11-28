import type { StateContainer } from '../core/StateContainer';
import type { StateContainerRegistry } from '../core/StateContainerRegistry';
import type {
  BlacPlugin,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './BlacPlugin';

interface InstalledPlugin {
  plugin: BlacPlugin;
  config: PluginConfig;
  context: PluginContext;
}

export class PluginManager {
  private plugins = new Map<string, InstalledPlugin>();
  private registry: StateContainerRegistry;

  constructor(registry: StateContainerRegistry) {
    this.registry = registry;
    this.setupLifecycleHooks();
  }

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

  getPlugin(pluginName: string): BlacPlugin | undefined {
    return this.plugins.get(pluginName)?.plugin;
  }

  getAllPlugins(): BlacPlugin[] {
    return Array.from(this.plugins.values()).map((p) => p.plugin);
  }

  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }
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

    // Event added
    this.registry.on('eventAdded', (vertex, event) => {
      this.notifyPlugins('onEventAdded', vertex, event);
    });

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
        // const TypeClass = instance.constructor as any;

        // if (TypeClass.instances) {
        //   for (const [key, entry] of TypeClass.instances) {
        //     if (entry.instance === instance) {
        //       break;
        //     }
        //   }
        // }

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

      getState: <S>(instance: StateContainer<S>): S => {
        return instance.state;
      },

      queryInstances: <T extends StateContainer<any>>(
        typeClass: new (...args: any[]) => T,
      ): T[] => {
        return (typeClass as any).getAll();
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
 */
export function createPluginManager(
  registry: StateContainerRegistry,
): PluginManager {
  return new PluginManager(registry);
}
