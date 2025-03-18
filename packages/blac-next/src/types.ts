import { Bloc } from './Bloc';
import { BlocBase } from './BlocBase';
import { Cubit } from './Cubit';

/**
 * Represents a constructor type for a Bloc that takes no parameters
 * @template B - The type of the Bloc instance
 */
export type BlocClassNoParams<B> = new (args: never[]) => B;

/**
 * Represents the abstract base types for Bloc and Cubit
 */
export type BlocBaseAbstract =
  | typeof Bloc<any, any, any>
  | typeof Cubit<any, any>;

/**
 * Represents a constructor type for a Bloc that can take any parameters
 * @template B - The type of the Bloc instance
 */
export type BlocConstructor<B> = new (...args: any) => B;

/**
 * Extracts the state type from a BlocBase instance
 * @template B - The BlocBase type to extract the state from
 */
export type ValueType<B extends BlocBase<any, any>> =
  B extends BlocBase<infer U, any> ? U : never;

/**
 * Represents either a Bloc or Cubit with their respective generic parameters
 * @template S - The state type
 * @template A - The action type (for Bloc)
 * @template P - The props type
 */
export type BlocGeneric<S = any, A = any, P = any> =
  | Bloc<S, A, P>
  | Cubit<S, P>;

/**
 * Extracts the state type from either a Bloc or Cubit
 * @template T - The Bloc or Cubit type to extract the state from
 */
export type BlocState<T> =
  T extends Bloc<infer S, any, any>
    ? S
    : T extends Cubit<infer S, any>
      ? S
      : never;

/**
 * Extracts the props type from either a Bloc or Cubit
 * @template T - The Bloc or Cubit type to extract the props from
 */
export type InferPropsFromGeneric<T> =
  T extends Bloc<any, infer P, any>
    ? P
    : T extends Cubit<any, infer P>
      ? P
      : never;

/**
 * Extracts the constructor parameters type from a BlocBase
 * @template B - The BlocBase type to extract the constructor parameters from
 */
export type BlocConstructorParameters<B extends BlocBase<any, any>> =
  BlocConstructor<B> extends new (...args: infer P) => any ? P : never;

/**
 * Represents a function type for determining hook dependencies based on state changes
 * @template B - The BlocGeneric type
 */
export type BlocHookDependencyArrayFn<B extends BlocGeneric<any, any>> = (
  newState: BlocState<B>,
  oldState: BlocState<B>,
) => unknown[][];
