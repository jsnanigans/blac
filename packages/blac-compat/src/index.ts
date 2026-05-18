/**
 * @9amhealth/blac-compat
 *
 * Compatibility shim exposing v0 (`blac`) and v1 (`blac-next` + `@blac/react`)
 * API surfaces backed by v2 (`@blac/core` + `@blac/react`) internals.
 *
 * Designed to be moved to `user-fe-reviews/packages/blac-compat` and aliased
 * from the v0 / v1 / `@blac/react` package names so application code does
 * not need to change during Phase 1 of the migration.
 */

export { Cubit } from './Cubit';
export { Bloc } from './Bloc';
export { BlocBase } from './BlocBase';
export type { BlacEvent } from './BlacEvent';
export { Blac, type BlacFacadeInstance, type GetBlocOptions } from './Blac';
export { BlocObserver, type BlocObserverMethods } from './BlocObserver';
export { BlacReact, type BlacReactOptions } from './BlacReact';
export { BlocProvider, type BlocProviderProps } from './BlocProvider';
export {
  useBloc,
  type V1UseBlocOptions,
  type V1UseBlocReturn,
} from './useBloc';
export { applyStaticConfig } from './statics';
