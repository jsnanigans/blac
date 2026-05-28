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
 * // Watch a bloc
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   console.log(userBloc.state.name);
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
