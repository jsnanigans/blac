import type { StateContainer } from '../core/StateContainer';

/**
 * Extract the state type from a StateContainer
 * @template T - The StateContainer type
 */
export type ExtractState<T> =
  T extends StateContainer<infer S, any> ? S : never;

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
