export { default as useBloc } from './useBloc';
export { default as useBlocNext } from './useBloc';
export { default as useBlocAdapter } from './useBlocAdapter';
export type { UseBlocAdapterOptions } from './useBlocAdapter';
export { default as useExternalBlocStore } from './useExternalBlocStore';
export { useBlocGraph, useBlocGraphFiltered } from './useBlocGraph';

// Adapter exports
export {
  ReactBlocAdapter,
  getOrCreateAdapter,
  hasAdapter,
  removeAdapter,
  getAdapterCacheStats,
  clearAdapterCache,
} from './adapter';
export type { Selector, CompareFn } from './adapter';
