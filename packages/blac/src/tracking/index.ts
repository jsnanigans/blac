/**
 * Dependency Tracking
 *
 * Framework-agnostic dependency tracking utilities for automatic reactivity.
 * These utilities can be used by any framework integration (React, Vue, Angular, etc.)
 * to track property accesses and detect changes.
 *
 * ## Usage
 *
 * ```typescript
 * import { tracked, watch, waitUntil } from '@blac/core';
 *
 * // Watch a bloc with automatic dependency tracking
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   console.log(userBloc.state.name);
 *   console.log(userBloc.fullName); // getter also tracked
 * });
 *
 * // Wait for a condition with automatic tracking
 * const bloc = await waitUntil(UserBloc, (bloc) => bloc.isReady);
 *
 * // Standalone tracked execution
 * const { result, dependencies } = tracked(() => {
 *   const user = ensure(UserBloc);
 *   return user.fullName;
 * });
 * ```
 */

// High-level dependency tracking
export {
  type DependencyState,
  type PathInfo,
  createDependencyState,
  startDependency,
  createDependencyProxy,
  capturePaths,
  hasDependencyChanges,
  hasTrackedData,
} from './dependency-tracker';

// Low-level proxy tracking
export {
  type ProxyState,
  createProxyState,
  startProxy,
  stopProxy,
  createInternal,
  createArrayProxy,
  createForTarget,
  isProxyable,
} from './proxy-tracker';

// Path utilities
export { parsePath, getValueAtPath, shallowEqual } from './path-utils';

// Getter tracking
export {
  type GetterState,
  createGetterState,
  createBlocProxy,
  hasGetterChanges,
  isGetter,
  getDescriptor,
  setActiveTracker,
  clearActiveTracker,
  getActiveTracker,
  commitTrackedGetters,
  invalidateRenderCache,
  resetGetterState,
  clearExternalDependencies,
  getGetterExecutionContext,
} from './getter-tracker';

// Tracking proxy
export {
  type TrackingProxyState,
  createState as createTrackingProxyState,
  startTracking as startTrackingProxy,
  stopTracking as stopTrackingProxy,
  createTrackingProxy,
  hasChanges as hasTrackingProxyChanges,
} from './tracking-proxy';

// Tracked execution primitive
export {
  tracked,
  createTrackedContext,
  TrackedContext,
  type TrackedResult,
  type TrackedOptions,
} from './tracked';

// Dependency management
export { DependencyManager } from './dependency-manager';
