/**
 * Debug/Advanced Subpath Export
 *
 * Advanced registry introspection and debugging utilities.
 * Import from '@blac/core/debug'
 *
 * These utilities are intended for debugging, testing, and advanced use cases.
 * Most applications don't need these - use the main '@blac/core' exports instead.
 *
 * @example
 * ```typescript
 * import { getStats, globalRegistry, hasInstance } from '@blac/core/debug';
 *
 * // Get registry statistics
 * const stats = getStats();
 * console.log(`Total instances: ${stats.totalInstances}`);
 *
 * // Check if an instance exists
 * if (hasInstance(UserBloc)) {
 *   console.log('UserBloc is registered');
 * }
 *
 * // Iterate over all instances of a type
 * forEach(UserBloc, (instance) => {
 *   console.log(instance.state);
 * });
 * ```
 *
 * @packageDocumentation
 */

// Registry introspection
export {
  hasInstance,
  getRefCount,
  getRefIds,
  getAll,
  forEach,
} from './registry/queries';
export { register } from './registry/management';
export { getRegistry, setRegistry, getStats } from './registry/config';

// Direct registry access
export { globalRegistry } from './core/StateContainerRegistry';
export type {
  LifecycleEvent,
  LifecycleListener,
  InstanceEntry,
} from './core/StateContainerRegistry';
