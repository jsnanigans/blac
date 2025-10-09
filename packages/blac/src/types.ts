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
export type BlocBaseAbstract = typeof Bloc<any, any> | typeof Cubit<any>;

/**
 * Represents a constructor type for a Bloc that can take any parameters
 * @template B - The type of the Bloc instance
 */
export type BlocConstructor<B> = (new (...args: any) => B) & {
  isolated?: boolean;
  keepAlive?: boolean;
};

export type BlocConstructorParams<B extends BlocConstructor<BlocBase<any>>> =
  ConstructorParameters<B>[0];

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
 * Enhanced constraint for Bloc events - must be objects with proper constructor
 */
export type BlocEventConstraint = object;

/**
 * Error boundary interface for Bloc error handling
 */
export interface BlocErrorBoundary<S, A extends BlocEventConstraint> {
  onError: (
    error: Error,
    event: A,
    currentState: S,
    bloc: { name: string; id: string },
  ) => void | Promise<void>;
  shouldRethrow?: (error: Error, event: A) => boolean;
}

/**
 * Function type for determining dependencies that trigger re-renders
 * Similar to React's useEffect dependency array - if any dependency changes, a re-render is triggered
 * @template S The state type
 * @template I The bloc instance type
 * @param currentState The current state
 * @param previousState The previous state (undefined on first call)
 * @param instance The bloc instance
 * @returns Array of dependencies - if any dependency changes, a re-render is triggered
 */
export type BlocHookDependencyArrayFn<S, I = any> = (
  currentState: S,
  previousState: S | undefined,
  instance: I,
) => unknown[];
