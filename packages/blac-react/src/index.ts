// Primary hook - Adapter Pattern implementation
export { default as useBloc } from './useBloc';
export type { UseBlocOptions } from './useBloc';

// Direct adapter hook export (same implementation as useBloc)
export { default as useBlocAdapter } from './useBlocAdapter';
export type { UseBlocAdapterOptions } from './useBlocAdapter';

// Other hooks
export { default as useExternalBlocStore } from './useExternalBlocStore';
export { useBlocGraph, useBlocGraphFiltered } from './useBlocGraph';

// Adapter Pattern infrastructure
export {
  ReactBlocAdapter,
  getOrCreateAdapter,
  hasAdapter,
  removeAdapter,
  getAdapterCacheStats,
  clearAdapterCache,
} from './adapter';
export type { Selector, CompareFn } from './adapter';
