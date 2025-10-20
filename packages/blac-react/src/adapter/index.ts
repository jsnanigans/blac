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
