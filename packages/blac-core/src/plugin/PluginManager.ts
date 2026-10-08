import { ALL_PATHS, type PathSet } from '@dirtytalk/structural';
import type { StateContainer } from '../core/StateContainer';
import { IS_DEV, readNodeEnv } from '../constants';
import { getBlacName } from '../utils/static-props';
import type { StateContainerConstructor } from '../types/utilities';
import type { StateContainerRegistry } from '../core/StateContainerRegistry';
import type {
  BlacPlugin,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './BlacPlugin';

/**
 * Internal structure for tracking installed plugins.
 *
 * `installContext` is the context handed to `onInstall` — it has no
 * `container`. Per-container contexts are built on demand by
 * `buildContext()` so each event carries the right focal container
 * without mutating a shared object.
 * @internal
 */
interface InstalledPlugin {
  plugin: BlacPlugin;
  config: PluginConfig;
  installContext: PluginContext;
}

/**
 * Per-container bookkeeping for the channel-bridge plugin dispatcher.
 *
 * - `unsub` tears down the channel subscription on dispose.
 * - `prevState` is the state snapshot the manager will hand plugins as
 *   `prev` on the next flush; it is updated to the post-flush state after
 *   each dispatch.
 * @internal
 */
interface ContainerBridge {
  unsub: () => void;
  prevState: any;
}

/**
 * Manages plugin lifecycle for the BlaC state management system.
 *
 * Hooks into registry lifecycle events (synchronous) and per-container
 * channel flushes (microtask-coalesced): while at least one installed
 * plugin implements `onStateChange`, the manager subscribes each container
 * with `ALL_PATHS` interest and dispatches
 * `onStateChange(ctx, prev, next, paths)` on every flush.
 *
 * `ALL_PATHS` interest defeats the single-consumer-skip optimization in
 * `StructuralContainer` — an intended trade-off for plugins that genuinely
 * want every change (devtools/persist). Plugins that want low overhead
 * should remain uninstalled or environment-gated.
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
  private lifecycleUnsubscribers: (() => void)[] = [];

  /**
   * Per-container channel-bridge bookkeeping, subscribed at `created` and
   * torn down at `disposed`/`destroy()`. Holds the rolling `prevState`
   * snapshot handed to plugins on each flush.
   *
   * Strong, not a `WeakMap`, because `destroy()` must enumerate live bridges
   * to unsubscribe them; entries are removed on `disposed`, so this never
   * outlives the registry's own reference.
   */
  private containerBridges = new Map<
    StateContainer<any, any, any>,
    ContainerBridge
  >();

  /**
   * One `PluginContext` per container, safe to reuse since it closes only
   * over `registry`/`container`, both stable for the container's lifetime.
   */
  private contextCache = new WeakMap<
    StateContainer<any, any, any>,
    PluginContext
  >();

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
      if (IS_DEV) {
        console.log(
          `[BlaC] Plugin "${plugin.name}" skipped (environment mismatch)`,
        );
      }
      return;
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed`);
    }

    const installContext = this.buildContext(undefined);

    if (plugin.onInstall) {
      try {
        plugin.onInstall(installContext);
      } catch (error) {
        console.error(
          `[BlaC] Error installing plugin "${plugin.name}":`,
          error,
        );
        throw error;
      }
    }

    this.plugins.set(plugin.name, {
      plugin,
      config: effectiveConfig,
      installContext,
    });
    this.backfillPlugin(plugin);

    if (IS_DEV) {
      console.log(
        `[BlaC] Plugin "${plugin.name}" v${plugin.version} installed`,
      );
    }
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
    if (!this.hasStateChangePlugin()) this.detachAllStateBridges();
    if (IS_DEV) {
      console.log(`[BlaC] Plugin "${pluginName}" uninstalled`);
    }
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

  destroy(): void {
    this.clear();
    for (const unsub of this.lifecycleUnsubscribers) {
      unsub();
    }
    this.lifecycleUnsubscribers = [];
  }

  /**
   * Wire registry lifecycle events into plugin dispatch.
   *
   * `onStateChange` is not wired through `registry.on('stateChanged', …)` —
   * that event lacks the `PathSet` payload. Instead each `created` subscribes
   * to the container's channel directly for `paths`, pairing it with
   * `(prev, next)` from the per-container snapshot.
   */
  private setupLifecycleHooks(): void {
    this.lifecycleUnsubscribers = [
      this.registry.on('created', (instance) => {
        if (this.hasStateChangePlugin()) this.attachStateBridge(instance);
        this.notifyPlugins('onCreated', instance);
      }),
      this.registry.on('disposed', (instance) => {
        this.notifyPlugins('onDestroyed', instance);
        this.detachStateBridge(instance);
      }),
      this.registry.on('refAcquired', (instance, refId) => {
        this.notifyPlugins('onRefAcquired', instance, refId);
      }),
      this.registry.on('refReleased', (instance, refId) => {
        this.notifyPlugins('onRefReleased', instance, refId);
      }),
      this.registry.on('depsChanged', (instance, previousDeps, currentDeps) => {
        this.notifyPlugins(
          'onDepsChanged',
          instance,
          previousDeps,
          currentDeps,
        );
      }),
      this.registry.on(
        'hydrationChanged',
        (instance, status, previousStatus) => {
          this.notifyPlugins(
            'onHydrationChange',
            instance,
            status,
            previousStatus,
          );
        },
      ),
      this.registry.on('activated', (instance, signal) => {
        this.notifyPlugins('onActivate', instance, signal);
      }),
      this.registry.on('deactivated', (instance) => {
        this.notifyPlugins('onDeactivate', instance);
      }),
    ];
  }

  /**
   * Subscribe to the container's channel with `ALL_PATHS` interest so it
   * fires on every flush. `prev` is the snapshot from the previous flush (or
   * create-time for the first); the channel's `paths` is passed straight
   * through to plugins.
   */
  private attachStateBridge(container: StateContainer<any, any, any>): void {
    // Defensive: if a container is somehow created twice (it shouldn't be),
    // don't double-subscribe — the existing bridge is canonical.
    if (this.containerBridges.has(container)) return;

    const bridge: ContainerBridge = {
      unsub: () => {},
      prevState: container.state,
    };
    this.containerBridges.set(container, bridge);

    bridge.unsub = container.channel.subscribe(
      () => ALL_PATHS,
      (paths) => this.dispatchStateChange(container, paths),
    );
  }

  private detachStateBridge(container: StateContainer<any, any, any>): void {
    const bridge = this.containerBridges.get(container);
    if (!bridge) return;
    bridge.unsub();
    this.containerBridges.delete(container);
  }

  // Bridges cost every container its single-consumer skip, so they exist only
  // while some installed plugin implements `onStateChange`.
  private hasStateChangePlugin(): boolean {
    for (const { plugin } of this.plugins.values()) {
      if (plugin.onStateChange) return true;
    }
    return false;
  }

  private detachAllStateBridges(): void {
    for (const bridge of this.containerBridges.values()) {
      bridge.unsub();
    }
    this.containerBridges.clear();
  }

  /**
   * Backfill a newly-installed plugin with existing instances: attach the
   * state bridge (idempotent) if it implements `onStateChange`, and invoke
   * `onCreated` for each. Scoped to this plugin only — `notifyPlugins` would
   * wrongly re-notify every plugin of every instance.
   */
  private backfillPlugin(plugin: BlacPlugin): void {
    if (!plugin.onStateChange && !plugin.onCreated) return;
    for (const Type of this.registry.getTypes()) {
      for (const instance of this.registry.getAll(Type)) {
        // getAll returns the readonly public view; internal bridging needs the
        // real container (same friction the `as any` in queryInstances handles).
        const container = instance as StateContainer<any, any, any>;
        if (plugin.onStateChange) this.attachStateBridge(container);

        if (!plugin.onCreated) continue;
        try {
          plugin.onCreated(this.buildContext(container));
        } catch (error) {
          console.error(
            `[BlaC] Error in plugin "${plugin.name}" onCreated (backfill):`,
            error,
          );
        }
      }
    }
  }

  /**
   * Channel-flush callback. Hands `(prev, next, paths)` to every enabled
   * plugin's `onStateChange`, then updates `prevState` for the next flush.
   * `prev` is captured once and reused across plugins, so every plugin sees
   * the same values regardless of dispatch order.
   */
  private dispatchStateChange(
    container: StateContainer<any, any, any>,
    paths: PathSet,
  ): void {
    const bridge = this.containerBridges.get(container);
    if (!bridge) return;

    const prev = bridge.prevState;
    const next = container.state;
    bridge.prevState = next;

    let ctx: PluginContext | undefined;
    for (const { plugin, config } of this.plugins.values()) {
      if (!config.enabled) continue;
      // eslint-disable-next-line @typescript-eslint/unbound-method -- invoked via .call below
      const hook = plugin.onStateChange;
      if (typeof hook !== 'function') continue;

      try {
        ctx ??= this.buildContext(container);
        hook.call(plugin, ctx, prev, next, paths);
      } catch (error) {
        console.error(
          `[BlaC] Error in plugin "${plugin.name}" onStateChange:`,
          error,
        );
      }
    }
  }

  /**
   * Notify all plugins of a lifecycle event. Builds a `PluginContext` lazily
   * on the first matching hook and reuses it for the rest of this dispatch —
   * zero builds if no enabled plugin implements `hookName`.
   */
  private notifyPlugins(
    hookName: Exclude<keyof BlacPlugin, 'onStateChange'>,
    instance: StateContainer<any, any, any>,
    ...extraArgs: any[]
  ): void {
    let ctx: PluginContext | undefined;
    for (const { plugin, config } of this.plugins.values()) {
      if (!config.enabled) continue;

      const hook = plugin[hookName];
      if (typeof hook !== 'function') continue;

      try {
        ctx ??= this.buildContext(instance);
        (hook as any).call(plugin, ctx, ...extraArgs);
      } catch (error) {
        console.error(
          `[BlaC] Error in plugin "${plugin.name}" ${hookName}:`,
          error,
        );
      }
    }
  }

  /**
   * Get the `PluginContext` for a focal container, building it once and
   * reusing it thereafter (evicted via the `WeakMap` when the container
   * dies). `undefined` (install-time) is never cached.
   */
  private buildContext(
    container: StateContainer<any, any, any> | undefined,
  ): PluginContext {
    if (container !== undefined) {
      const cached = this.contextCache.get(container);
      if (cached) return cached;
    }
    const context = this.createContext(container);
    if (container !== undefined) this.contextCache.set(container, context);
    return context;
  }

  private createContext(
    container: StateContainer<any, any, any> | undefined,
  ): PluginContext {
    const registry = this.registry;
    return {
      container,

      getInstanceMetadata: (
        instance: StateContainer<any, any, any>,
      ): InstanceMetadata => {
        return {
          id: instance.$blac.id,
          className: getBlacName(
            instance.constructor as StateContainerConstructor,
          ),
          isDisposed: instance.$blac.disposed,
          name: instance.$blac.name,
          createdAt: instance.$blac.createdAt,
          state: instance.state,
          hydrationStatus: instance.$blac.hydration.status,
          isHydrated: instance.$blac.hydration.isHydrated,
          hydrationError: instance.$blac.hydration.error,
          changedWhileHydrating: instance.$blac.hydration.changedWhileHydrating,
          args: instance.args,
        };
      },

      getState: <S extends object = any>(instance: StateContainer<S>): S => {
        return instance.state;
      },

      getHydrationStatus: (instance: StateContainer<any, any, any>) => {
        return instance.$blac.hydration.status;
      },

      startHydration: (instance: StateContainer<any, any, any>) => {
        instance.$blac.hydration.begin();
      },

      applyHydratedState: <S extends object = any>(
        instance: StateContainer<S>,
        state: S,
      ): boolean => {
        return instance.$blac.hydration.apply(state);
      },

      finishHydration: (instance: StateContainer<any, any, any>) => {
        instance.$blac.hydration.finish();
      },

      failHydration: (
        instance: StateContainer<any, any, any>,
        error: Error,
      ) => {
        instance.$blac.hydration.fail(error);
      },

      waitForHydration: (instance: StateContainer<any, any, any>) => {
        return instance.$blac.hydration.wait();
      },

      queryInstances: <T extends StateContainer<any, any, any>>(
        typeClass: new (...args: any[]) => T,
      ): T[] => {
        return registry.getAll(typeClass as any);
      },

      getAllTypes: () => {
        return registry.getTypes();
      },

      getStats: () => {
        return registry.getStats();
      },

      getRefIds: (instanceId: string): string[] => {
        return registry.getRefIdsById(instanceId);
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
   * Same rule as `IS_DEV`: an unknown environment counts as production.
   */
  private getCurrentEnvironment(): 'development' | 'production' | 'test' {
    const env = readNodeEnv();
    if (env === undefined || env === 'production') return 'production';
    return env === 'test' ? 'test' : 'development';
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
