/**
 * Watch Subpath Export
 *
 * Reactive subscription utilities for watching bloc state changes.
 * Import from '@blac/core/watch'
 *
 * @example
 * ```typescript
 * import { watch, instance } from '@blac/core/watch';
 *
 * // Watch a bloc with automatic dependency tracking
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   console.log(userBloc.state.name);
 *   console.log(userBloc.fullName); // getter also tracked
 * });
 *
 * // Watch a specific instance
 * const unwatch = watch(instance(UserBloc, 'user-123'), (userBloc) => {
 *   console.log(userBloc.state.name);
 * });
 * ```
 *
 * @packageDocumentation
 */

export { watch, instance, type WatchFn, type BlocRef } from './watch';

// Also export tracked utilities for advanced use cases
export {
  tracked,
  createTrackedContext,
  TrackedContext,
  type TrackedResult,
  type TrackedOptions,
} from './tracking/tracked';
