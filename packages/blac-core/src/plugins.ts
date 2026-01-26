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
 *   onInstanceCreated(context) {
 *     console.log('Instance created:', context.instance);
 *   },
 * };
 *
 * getPluginManager().register(myPlugin);
 * ```
 *
 * @packageDocumentation
 */

export { PluginManager } from './plugin/PluginManager';
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';
export { getPluginManager } from './core/StateContainerRegistry';
