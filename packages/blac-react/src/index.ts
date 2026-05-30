/**
 * React Integration
 *
 * Clean integration between React and StateContainer architecture.
 * Constructor-based API with automatic type inference.
 * Re-renders are driven by per-consumer, path-scoped channel subscriptions.
 */

export { useBloc } from './useBloc';
export { configureBlacReact } from './config';
export type { BlacReactConfig } from './config';
export type { UseBlocOptions, UseBlocReturn } from './types';
export {
  BlocProvider,
  useInstanceIdFromContext,
  type BlocProviderProps,
} from './BlocProvider';
