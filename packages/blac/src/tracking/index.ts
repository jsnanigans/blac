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
  type TrackerState,
  type PathInfo,
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
  hasTrackedData,
} from './dependency-tracker';

// Low-level proxy tracking
export {
  type ProxyTrackerState,
  createProxyTrackerState,
  startProxyTracking,
  stopProxyTracking,
  createProxyInternal,
  createArrayProxy,
  createProxyForTarget,
  isProxyable,
} from './proxy-tracker';

// Path utilities
export { parsePath, getValueAtPath, shallowEqual } from './path-utils';

// Getter tracking
export {
  type GetterTrackerState,
  createGetterTracker,
  createBlocProxy,
  hasGetterChanges,
  isGetter,
  getDescriptor,
  setActiveTracker,
  clearActiveTracker,
  getActiveTracker,
  commitTrackedGetters,
  invalidateRenderCache,
  resetGetterTracker,
  clearExternalDependencies,
  getGetterExecutionContext,
} from './getter-tracker';

// Unified tracking
export {
  type UnifiedTrackerState,
  createUnifiedTrackerState,
  startUnifiedTracking,
  stopUnifiedTracking,
  createTrackingProxy,
  hasUnifiedChanges,
} from './create-tracking-proxy';

// Tracked execution primitive
export {
  tracked,
  createTrackedContext,
  TrackedContext,
  type TrackedResult,
  type TrackedOptions,
} from './tracked';

// Dependency subscription management
export { DependencySubscriptionManager } from './dependency-subscription-manager';
