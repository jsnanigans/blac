// Re-renders are driven by per-consumer, path-scoped channel subscriptions.

export { useBloc } from './useBloc';
export { useBlocDeps } from './useBlocDeps';
export { untracked } from '@dirtytalk/structural';
export type { UseBlocOptions, UseBlocReturn } from './types';
export {
  BlocProvider,
  useProvidedArgs,
  type BlocProviderProps,
} from './BlocProvider';
export {
  RegistryProvider,
  useRegistry,
  type RegistryProviderProps,
} from './RegistryProvider';
