/**
 * Dependency Tracking
 *
 * Framework-agnostic dependency tracking utilities for automatic reactivity.
 * These utilities are used by framework adapters (React, Vue, Angular, etc.)
 * to track property accesses and detect changes.
 *
 * @packageDocumentation
 */

// Dependency tracking (used by framework adapters)
export {
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
  setActiveTracker,
  clearActiveTracker,
  commitTrackedGetters,
  invalidateRenderCache,
} from './tracking-proxy';

// Path utilities (only shallowEqual is used by adapters)
export { shallowEqual } from './path-utils';

// Dependency management
export { DependencyManager } from './dependency-manager';

// Dependency resolution
export { resolveDependencies } from './resolve-dependencies';
