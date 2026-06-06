import { ALL_PATHS, type PathSet } from '@dirtytalk/structural';
import type { StateContainer } from '../core/StateContainer';
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
 * The manager hooks into two surfaces:
 *
 * 1. **Registry lifecycle events** (`created`, `disposed`, `refAcquired`,
 *    `refReleased`, `depsChanged`) — synchronous, fired by the registry.
 *
 * 2. **Per-container channel flushes** — microtask-coalesced. For each
 *    container, the manager subscribes once at create-time with
 *    `ALL_PATHS` interest and stashes `prevState`. On every flush it
 *    captures the new state + the changed `PathSet` and dispatches
 *    `onStateChange(ctx, prev, next, paths)` to every enabled plugin.
 *
 * The `ALL_PATHS` subscription cost: plugins counted as a consumer with
 * `ALL_PATHS` interest will defeat the single-consumer-skip optimization
 * in `StructuralContainer`. This is the intended trade-off — devtools /
 * persist plugins genuinely want every change, and stateful plugins
 * (logging) can decode `paths` via `container.interner.lookup(id)` to log
 * only relevant fields. Plugins that want low overhead should remain
 * uninstalled or environment-gated.
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
   * Per-container channel-bridge bookkeeping. Subscribed at `created`,
   * torn down at `disposed`. Holds the rolling `prevState` snapshot the
   * manager hands plugins on each flush.
   */
  private containerBridges = new WeakMap<
    StateContainer<any, any, any>,
    ContainerBridge
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
      console.log(
        `[BlaC] Plugin "${plugin.name}" skipped (environment mismatch)`,
      );
      return;
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed`);
    }

    const installContext = this.buildContext(undefined);

    this.plugins.set(plugin.name, {
      plugin,
      config: effectiveConfig,
      installContext,
    });

    if (plugin.onInstall) {
      try {
        plugin.onInstall(installContext);
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
   * `onStateChange` is NOT wired through `registry.on('stateChanged', …)` —
   * that event lacks the `PathSet` payload. Instead, on each `created` we
   * subscribe to the container's channel directly so we get
   * `(paths)` and capture `(prev, next)` via the per-container snapshot.
   */
  private setupLifecycleHooks(): void {
    this.lifecycleUnsubscribers = [
      this.registry.on('created', (instance) => {
        this.attachStateBridge(instance);
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
    ];
  }

  /**
   * Subscribe to the container's channel with `ALL_PATHS` interest, so we
   * fire on every flush. Capture `prev` from the snapshot taken on the
   * previous flush (or at create-time for the first flush) and pass the
   * channel's `paths` argument straight through to plugins.
   *
   * Per-container bookkeeping is stored in a `WeakMap` keyed by the
   * container itself, so a disposed/GC'd container drops cleanly.
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

  /**
   * Channel-flush callback. Snapshots `next`, hands `(prev, next, paths)`
   * to every enabled plugin's `onStateChange`, then updates `prevState`
   * for the next flush.
   *
   * Note: `prev` is captured once and reused across plugins — every
   * plugin sees the same `prev`/`next`/`paths` regardless of dispatch
   * order, matching the "snapshot prev once per flush" invariant.
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

    for (const { plugin, config } of this.plugins.values()) {
      if (!config.enabled) continue;
      // eslint-disable-next-line @typescript-eslint/unbound-method -- invoked via .call below
      const hook = plugin.onStateChange;
      if (typeof hook !== 'function') continue;

      try {
        hook.call(plugin, this.buildContext(container), prev, next, paths);
      } catch (error) {
        console.error(
          `[BlaC] Error in plugin "${plugin.name}" onStateChange:`,
          error,
        );
      }
    }
  }

  /**
   * Notify all plugins of a lifecycle event.
   *
   * Builds a fresh `PluginContext` per dispatch (instance becomes
   * `ctx.container`), so plugins can reach the focal bloc through
   * `ctx.container`.
   */
  private notifyPlugins(
    hookName: Exclude<keyof BlacPlugin, 'onStateChange'>,
    instance: StateContainer<any, any, any>,
    ...extraArgs: any[]
  ): void {
    for (const { plugin, config } of this.plugins.values()) {
      if (!config.enabled) continue;

      const hook = plugin[hookName];
      if (typeof hook !== 'function') continue;

      try {
        (hook as any).call(plugin, this.buildContext(instance), ...extraArgs);
      } catch (error) {
        console.error(
          `[BlaC] Error in plugin "${plugin.name}" ${hookName}:`,
          error,
        );
      }
    }
  }

  /**
   * Build a `PluginContext` for a given focal container. The context is
   * cheap to build — its methods close over `this.registry` directly —
   * so we create one per dispatch rather than caching per container.
   * This sidesteps the lifetime question of "when do we evict a cached
   * context?" and keeps `paths`-vs-`container` lifetimes cleanly
   * separated.
   */
  private buildContext(
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
          className: instance.constructor.name,
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
        for (const Type of registry.getTypes()) {
          const map = registry.getInstancesMap(Type);
          for (const [, entry] of map) {
            if (entry.instance.$blac.id === instanceId) {
              return Array.from(entry.refs.keys());
            }
          }
        }
        return [];
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
