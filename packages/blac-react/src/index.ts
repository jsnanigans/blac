/**
 * React Integration
 *
 * Clean integration between React and StateContainer architecture.
 * Constructor-based API with automatic type inference.
 * Supports concurrent (useSyncExternalStore) mode for optimal performance.
 */

export { useBloc } from './useBloc';
export { configureBlacReact } from './config';
export type { BlacReactConfig } from './config';
export type { UseBlocOptions, UseBlocReturn } from './types';
