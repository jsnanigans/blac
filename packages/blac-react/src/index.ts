/**
 * React Integration
 *
 * Clean integration between React and StateContainer architecture.
 * Constructor-based API with automatic type inference.
 * Uses React 18's useSyncExternalStore for optimal compatibility.
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
} from './useBloc';
