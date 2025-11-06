/**
 * React Integration
 *
 * Clean integration between React and StateContainer architecture.
 * Constructor-based API with automatic type inference.
 * Supports concurrent (useSyncExternalStore) mode for optimal performance.
 */

export { useBloc } from './useBloc';
export { useBlocActions } from './useBlocActions';
export type { UseBlocOptions, UseBlocReturn } from './types';
export type { UseBlocActionsOptions } from './useBlocActions';

export * from '@blac/core';
