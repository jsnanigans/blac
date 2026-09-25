/**
 * Plugins Subpath Export
 *
 * Plugin system utilities for extending BlaC functionality.
 * Import from `@blac/core/plugins`
 *
 * @example
 * ```typescript
 * import { PluginManager, getPluginManager, type BlacPlugin } from '@blac/core/plugins';
 *
 * const myPlugin: BlacPlugin = {
 *   name: 'my-plugin',
 *   onCreated(context) {
 *     console.log('Instance created:', context.container);
 *   },
 * };
 *
 * getPluginManager().install(myPlugin);
 * ```
 *
 * @packageDocumentation
 */

import { createPluginManager, PluginManager } from './plugin/PluginManager';
import {
  globalRegistry,
  type StateContainerRegistry,
} from './core/StateContainerRegistry';

export { PluginManager } from './plugin/PluginManager';
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';

const pluginManagers = new WeakMap<StateContainerRegistry, PluginManager>();

/**
 * Get the plugin manager for a registry (the global one by default). Plugins
 * only observe the registry they are installed on, so install them again on
 * a scoped registry (e.g. one passed to `RegistryProvider`).
 */
export function getPluginManager(
  registry: StateContainerRegistry = globalRegistry,
): PluginManager {
  let manager = pluginManagers.get(registry);
  if (!manager) {
    manager = createPluginManager(registry);
    pluginManagers.set(registry, manager);
  }
  return manager;
}
