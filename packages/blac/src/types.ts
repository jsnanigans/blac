/* eslint-disable @typescript-eslint/no-explicit-any */
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
export type ValueType<B extends BlocBase<any>> =
  B extends BlocBase<infer U> ? U : never;

/**
 * Extracts the state type from either a Bloc or Cubit
 * @template T - The Bloc or Cubit type to extract the state from
 */
export type BlocState<T> = T extends BlocBase<infer S> ? S : never;

/**
 * Extracts the props type from either a Bloc or Cubit
 * @template T - The Bloc or Cubit type to extract the props from
 */
export type InferPropsFromGeneric<T> =
  T extends Bloc<any, any, infer P>
    ? P
    : T extends Cubit<any, infer P>
      ? P
      : never;

/**
 * Extracts the constructor parameters type from a BlocBase
 * @template B - The BlocBase type to extract the constructor parameters from
 */
export type BlocConstructorParameters<B extends BlocBase<any>> =
  BlocConstructor<B> extends new (...args: infer P) => B ? P : never;

/**
 * Represents a function type for determining hook dependencies based on state changes
 * @template B - The BlocGeneric type
 */
export type BlocHookDependencyArrayFn<S> = (
  newState: S
) => unknown[][];
