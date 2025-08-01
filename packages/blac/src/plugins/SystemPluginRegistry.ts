import {
  BlacPlugin,
  PluginRegistry,
  PluginMetrics,
  ErrorContext,
  AdapterMetadata,
} from './types';
import { BlocBase } from '../BlocBase';
import { Bloc } from '../Bloc';

/**
 * Registry for system-wide plugins
 */
export class SystemPluginRegistry implements PluginRegistry<BlacPlugin> {
  private plugins = new Map<string, BlacPlugin>();
  private metrics = new Map<string, Map<string, PluginMetrics>>();
  private executionOrder: string[] = [];

  /**
   * Add a system plugin
   */
  add(plugin: BlacPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    this.executionOrder.push(plugin.name);
    this.initializeMetrics(plugin.name);
  }

  /**
   * Remove a system plugin
   */
  remove(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return false;

    this.plugins.delete(pluginName);
    this.metrics.delete(pluginName);
    this.executionOrder = this.executionOrder.filter(
      (name) => name !== pluginName,
    );

    return true;
  }

  /**
   * Get a plugin by name
   */
  get(pluginName: string): BlacPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all plugins in execution order
   */
  getAll(): ReadonlyArray<BlacPlugin> {
    return this.executionOrder.map((name) => this.plugins.get(name)!);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.metrics.clear();
    this.executionOrder = [];
  }

  /**
   * Execute a hook on all plugins
   */
  executeHook(
    hookName: keyof BlacPlugin,
    args: unknown[],
    errorHandler?: (error: Error, plugin: BlacPlugin) => void,
  ): void {
    for (const pluginName of this.executionOrder) {
      const plugin = this.plugins.get(pluginName)!;
      const hook = plugin[hookName] as Function | undefined;

      if (typeof hook !== 'function') continue;

      const startTime = performance.now();

      try {
        hook.apply(plugin, args);
        this.recordSuccess(pluginName, hookName as string, startTime);
      } catch (error) {
        this.recordError(pluginName, hookName as string, error as Error);

        if (errorHandler) {
          errorHandler(error as Error, plugin);
        } else {
          // Default: log and continue
          console.error(
            `Plugin '${pluginName}' error in hook '${hookName as string}':`,
            error,
          );
        }
      }
    }
  }

  /**
   * Bootstrap all plugins
   */
  bootstrap(): void {
    this.executeHook('beforeBootstrap', []);
    this.executeHook('afterBootstrap', []);
  }

  /**
   * Shutdown all plugins
   */
  shutdown(): void {
    this.executeHook('beforeShutdown', []);
    this.executeHook('afterShutdown', []);
  }

  /**
   * Notify plugins of bloc creation
   */
  notifyBlocCreated(bloc: BlocBase<any>): void {
    this.executeHook('onBlocCreated', [bloc]);
  }

  /**
   * Notify plugins of bloc disposal
   */
  notifyBlocDisposed(bloc: BlocBase<any>): void {
    this.executeHook('onBlocDisposed', [bloc]);
  }

  /**
   * Notify plugins of state change
   */
  notifyStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void {
    this.executeHook('onStateChanged', [bloc, previousState, currentState]);
  }

  /**
   * Notify plugins of event addition
   */
  notifyEventAdded(bloc: Bloc<any, any>, event: any): void {
    this.executeHook('onEventAdded', [bloc, event]);
  }

  /**
   * Notify plugins of errors
   */
  notifyError(
    error: Error,
    bloc: BlocBase<unknown>,
    context: ErrorContext,
  ): void {
    this.executeHook('onError', [error, bloc, context], (hookError, plugin) => {
      // Double fault protection - if error handler fails, just log
      console.error(`Plugin '${plugin.name}' error handler failed:`, hookError);
    });
  }

  /**
   * Notify plugins of adapter lifecycle events
   */
  notifyAdapterCreated(adapter: any, metadata: AdapterMetadata): void {
    this.executeHook('onAdapterCreated', [adapter, metadata]);
  }

  notifyAdapterMount(adapter: any, metadata: AdapterMetadata): void {
    this.executeHook('onAdapterMount', [adapter, metadata]);
  }

  notifyAdapterUnmount(adapter: any, metadata: AdapterMetadata): void {
    this.executeHook('onAdapterUnmount', [adapter, metadata]);
  }

  notifyAdapterRender(adapter: any, metadata: AdapterMetadata): void {
    this.executeHook('onAdapterRender', [adapter, metadata]);
  }

  notifyAdapterDisposed(adapter: any, metadata: AdapterMetadata): void {
    this.executeHook('onAdapterDisposed', [adapter, metadata]);
  }

  /**
   * Get metrics for a plugin
   */
  getMetrics(pluginName: string): Map<string, PluginMetrics> | undefined {
    return this.metrics.get(pluginName);
  }

  private initializeMetrics(pluginName: string): void {
    this.metrics.set(pluginName, new Map());
  }

  private recordSuccess(
    pluginName: string,
    hookName: string,
    startTime: number,
  ): void {
    const pluginMetrics = this.metrics.get(pluginName)!;
    const hookMetrics = pluginMetrics.get(hookName) || {
      executionTime: 0,
      executionCount: 0,
      errorCount: 0,
    };

    const executionTime = performance.now() - startTime;

    pluginMetrics.set(hookName, {
      ...hookMetrics,
      executionTime: hookMetrics.executionTime + executionTime,
      executionCount: hookMetrics.executionCount + 1,
      lastExecutionTime: executionTime,
    });
  }

  private recordError(
    pluginName: string,
    hookName: string,
    error: Error,
  ): void {
    const pluginMetrics = this.metrics.get(pluginName)!;
    const hookMetrics = pluginMetrics.get(hookName) || {
      executionTime: 0,
      executionCount: 0,
      errorCount: 0,
    };

    pluginMetrics.set(hookName, {
      ...hookMetrics,
      errorCount: hookMetrics.errorCount + 1,
      lastError: error,
    });
  }
}
