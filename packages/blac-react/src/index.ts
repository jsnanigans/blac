/**
 * React Integration
 *
 * Clean integration between React and StateContainer architecture.
 * Constructor-based API with automatic type inference.
 * Supports concurrent (useSyncExternalStore) mode for optimal performance.
 */

export {
  ReactBridge,
  createReactBridge,
  type SubscribeCallback,
  type Unsubscribe,
} from './ReactBridge';
export {
  useBloc,
  default as useBlocHook,
  type UseBlocOptions,
  type UseBlocReturn,
  BlocConfig,
  type BlocMode,
} from './useBloc';
export { useBlocConcurrent } from './useBlocConcurrent';
export { useBlocNext } from './useBlocNext';
export { NextBridge } from './NextBridge';
export type { ComponentRef } from './types';
