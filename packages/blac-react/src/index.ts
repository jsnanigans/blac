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
} from './ReactBridge.optimized';
export {
  useBloc,
  default as useBlocHook,
  type UseBlocOptions,
  type UseBlocReturn,
} from './useBloc';
export type { ComponentRef } from './types';
