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
 * import { tracked, watch } from '@blac/core';
 *
 * // Watch a bloc with automatic dependency tracking
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   console.log(userBloc.state.name);
 *   console.log(userBloc.fullName); // getter also tracked
 * });
 *
 * // Standalone tracked execution
 * const { result, dependencies } = tracked(() => {
 *   const user = ensure(UserBloc);
 *   return user.fullName;
 * });
 * ```
 */

// Consolidated tracking system (proxy, dependency, getter tracking)
export {
  // Proxy tracking (low-level)
  type ProxyState,
  createProxyState,
  startProxy,
  stopProxy,
  createInternal,
  createArrayProxy,
  createForTarget,
  isProxyable,
  // Dependency tracking
  type DependencyState,
  type PathInfo,
  createDependencyState,
  startDependency,
  createDependencyProxy,
  capturePaths,
  hasDependencyChanges,
  hasTrackedData,
  // Getter tracking
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
  // Combined tracking proxy
  type TrackingProxyState,
  createState as createTrackingProxyState,
  startTracking as startTrackingProxy,
  stopTracking as stopTrackingProxy,
  createTrackingProxy,
  hasChanges as hasTrackingProxyChanges,
} from './tracking-proxy';

// Path utilities
export { parsePath, getValueAtPath, shallowEqual } from './path-utils';

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
