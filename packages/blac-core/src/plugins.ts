/**
 * Plugins Subpath Export
 *
 * Plugin system utilities for extending BlaC functionality.
 * Import from '@blac/core/plugins'
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
 * getPluginManager().register(myPlugin);
 * ```
 *
 * @packageDocumentation
 */

import { createPluginManager, PluginManager } from './plugin/PluginManager';
import { globalRegistry } from './core/StateContainerRegistry';

export { PluginManager } from './plugin/PluginManager';
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';

/**
 * Global plugin manager (initialized lazily)
 */
let _globalPluginManager: PluginManager | null = null;

/**
 * Get the global plugin manager
 */
export function getPluginManager(): PluginManager {
  if (!_globalPluginManager) {
    _globalPluginManager = createPluginManager(globalRegistry);
  }
  return _globalPluginManager;
}
