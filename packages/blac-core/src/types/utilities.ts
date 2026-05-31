import type { StateContainer } from '../core/StateContainer';

/**
 * Extract the state type from a StateContainer
 * @template T - The StateContainer type
 */
export type ExtractState<T> =
  T extends StateContainerConstructor<infer S> ? Readonly<S> : never;

export type ExtractStateMutable<T> =
  T extends StateContainerConstructor<infer S> ? S : never;

/**
 * Constructor type for StateContainer classes
 * @template S - State type managed by the container
 */
export type StateContainerConstructor<S extends object = any> = new (
  ...args: any[]
) => StateContainer<S, any, any>;

/**
 * Extract the args type (serializable construction/identity data) from a
 * StateContainer subclass.
 * @template T - The StateContainer constructor type
 */
export type ExtractArgs<T> = T extends new () => StateContainer<
  any,
  infer A,
  any
>
  ? A
  : void;

/**
 * Extract the deps type (injected non-serializable handles) from a
 * StateContainer subclass.
 * @template T - The StateContainer constructor type
 */
export type ExtractDeps<T> = T extends new () => StateContainer<
  any,
  any,
  infer D
>
  ? D
  : Record<string, never>;

export type InstanceReadonlyState<T extends StateContainerConstructor = any> =
  Omit<InstanceType<T>, 'state'> & { state: ExtractState<T> };

export type InstanceState<T extends StateContainerConstructor = any> = Omit<
  InstanceType<T>,
  'state'
> & { state: ExtractStateMutable<T> };

export type StateContainerInstance<S extends object = any> = Omit<
  StateContainer<S, any, any>,
  'state'
> & { state: Readonly<S> };

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
 * Constructor type for StateContainer classes.
 * Used for type-safe hook parameters.
 * @template TBloc - The StateContainer instance type
 */
export type BlocConstructor<
  S extends object = any,
  T extends new (...args: any[]) => StateContainer<S, any, any> = new (
    ...args: any[]
  ) => StateContainer<S, any, any>,
> = (new (...args: any[]) => InstanceType<T>) & {
  keepAlive?: boolean;
};
