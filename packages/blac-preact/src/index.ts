/**
 * Preact Integration
 *
 * Clean integration between Preact and StateContainer architecture.
 * Constructor-based API with automatic type inference.
 * Supports concurrent mode via useSyncExternalStore shim.
 */

export { useBloc } from './useBloc';
export { configureBlacPreact, resetBlacPreactConfig } from './config';
export type { BlacPreactConfig } from './config';
export type { UseBlocOptions, UseBlocReturn } from './types';
