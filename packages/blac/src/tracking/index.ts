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
 * import {
 *   createTrackerState,
 *   startTracking,
 *   createProxy,
 *   captureTrackedPaths,
 *   hasChanges
 * } from '@blac/core';
 *
 * // Create tracker state
 * const tracker = createTrackerState<MyState>();
 *
 * // During render:
 * startTracking(tracker);
 * const proxy = createProxy(tracker, state);
 * // ... render with proxy ...
 * captureTrackedPaths(tracker, state);
 *
 * // On state change:
 * if (hasChanges(tracker, newState)) {
 *   // Trigger re-render
 * }
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
