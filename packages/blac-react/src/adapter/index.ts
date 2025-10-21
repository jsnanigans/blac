/**
 * Adapter Module
 *
 * Export all adapter-related functionality
 */

export { ReactBlocAdapter } from './ReactBlocAdapter';
export type { Selector, CompareFn } from './ReactBlocAdapter';

export {
  getOrCreateAdapter,
  hasAdapter,
  removeAdapter,
  getAdapterCacheStats,
  clearAdapterCache,
  resetAdapterCacheStats,
} from './AdapterCache';

export { DependencyTracker } from './DependencyTracker';

export {
  AutoTrackDebugger,
  getGlobalDebugger,
  enableGlobalDebug,
  disableGlobalDebug,
} from './AutoTrackDebugger';
export type {
  DependencyChangeInfo,
  RerenderInfo,
  PerformanceMetrics,
} from './AutoTrackDebugger';

export {
  devToolsRegistry,
  enableDevTools,
  disableDevTools,
  isDevToolsEnabled,
  measurePerformance,
  reportRerender,
} from './DevToolsHooks';
export type {
  DevToolsSubscriptionInfo,
  DevToolsAdapterInfo,
  DevToolsRerenderEvent,
  DevToolsPerformanceEvent,
} from './DevToolsHooks';
