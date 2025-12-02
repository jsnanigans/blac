import type { StateContainer } from '../core/StateContainer';

/**
 * Extract the state type from a StateContainer
 * @template T - The StateContainer type
 */
export type ExtractState<T> =
  T extends StateContainer<infer S, any> ? S : never;

/**
 * Conditionally override the state type of a StateContainer.
 * When S is `never`, returns T unchanged (inferred state type).
 * When S is provided, replaces the state type while preserving all other properties.
 *
 * @template T - The StateContainer type
 * @template S - The state type override (defaults to never)
 *
 * @example
 * // Without override - returns original type
 * type Result1 = StateOverride<MyBloc>; // MyBloc
 *
 * // With override - replaces state type
 * type Result2 = StateOverride<MyBloc, CustomState>; // Omit<MyBloc, 'state'> & { readonly state: CustomState }
 */
export type StateOverride<
  T extends StateContainer<any, any>,
  S = never,
> = [S] extends [never]
  ? T
  : Omit<T, 'state'> & { readonly state: S };

/**
 * Extract the props type from a StateContainer
 * @template T - The StateContainer type
 */
export type ExtractProps<T> =
  T extends StateContainer<any, infer P> ? P : undefined;

/**
 * Extract constructor argument types from a class
 * @template T - The class type
 */
export type ExtractConstructorArgs<T> = T extends new (...args: infer P) => any
  ? P
  : never[];

/**
 * Constructor type for StateContainer classes with static registry methods.
 * Used for type-safe hook parameters.
 * @template TBloc - The StateContainer instance type
 */
export type BlocConstructor<TBloc extends StateContainer<any, any>> = (new (
  ...args: any[]
) => TBloc) & {
  resolve(instanceKey?: string, ...args: any[]): TBloc;
  get(instanceKey?: string): TBloc;
  getSafe(
    instanceKey?: string,
  ): { error: Error; instance: null } | { error: null; instance: TBloc };
  release(instanceKey?: string): void;
  isolated?: boolean;
  keepAlive?: boolean;
};
