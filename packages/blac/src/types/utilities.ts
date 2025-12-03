import type { StateContainer } from '../core/StateContainer';

/**
 * Extract the state type from a StateContainer
 * @template T - The StateContainer type
 */
export type ExtractState<T> =
  T extends StateContainerConstructor<infer S, any> ? S : never;

/**
 * Constructor type for StateContainer classes
 * @template S - State type managed by the container
 * @template P - Props type passed to the container
 */
export type StateContainerConstructor<S = any, P = any> = new (
  ...args: any[]
) => StateContainer<S, P>;

/**
 * Extract the props type from a StateContainer
 * @template T - The StateContainer type
 */
export type ExtractProps<T> =
  T extends StateContainerConstructor<any, infer P> ? P : undefined;

/**
 * Extract constructor argument types from a class
 * @template T - The class type
 */
export type ExtractConstructorArgs<T> = T extends new (...args: infer P) => any
  ? P
  : never[];

/**
 * Extract instance type from an abstract class constructor
 * @template T - The abstract class constructor type
 */
export type BlocInstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;

/**
 * Constructor type for StateContainer classes with static registry methods.
 * Used for type-safe hook parameters.
 * @template TBloc - The StateContainer instance type
 */
export type BlocConstructor<
  S = any,
  T extends new (...args: any[]) => StateContainer<S, any> = new (
    ...args: any[]
  ) => StateContainer<S, any>,
> = (new (...args: any[]) => InstanceType<T>) & {
  resolve(instanceKey?: string, ...args: any[]): InstanceType<T>;
  get(instanceKey?: string, ...args: any[]): InstanceType<T> | null;
  getSafe(
    instanceKey?: string,
    ...args: any[]
  ):
    | { error: Error; instance: null }
    | { error: null; instance: InstanceType<T> };
  release(instanceKey?: string): void;
  isolated?: boolean;
  keepAlive?: boolean;
};
