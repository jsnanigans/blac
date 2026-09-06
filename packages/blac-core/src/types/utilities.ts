import type { StateContainer } from '../core/StateContainer';

/**
 * Extract the state type from a StateContainer
 * @typeParam T - The StateContainer type
 */
export type ExtractState<T> =
  T extends StateContainerConstructor<infer S> ? Readonly<S> : never;

export type ExtractStateMutable<T> =
  T extends StateContainerConstructor<infer S> ? S : never;

/**
 * Constructor type for StateContainer classes
 * @typeParam S - State type managed by the container
 */
export type StateContainerConstructor<S extends object = any> =
  new () => StateContainer<S, any, any>;

/**
 * Extract the args type (serializable construction/identity data) from a
 * StateContainer subclass.
 * @typeParam T - The StateContainer constructor type
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
 * @typeParam T - The StateContainer constructor type
 */
export type ExtractDeps<T> = T extends new () => StateContainer<
  any,
  any,
  infer D
>
  ? D
  : Record<string, never>;

/**
 * Narrow a container instance's `state` without erasing the class. A plain
 * intersection keeps private members, `this` types and symbol keys, so the
 * result stays assignable to `StateContainer`; `state` is getter-only at the
 * source, so no `readonly` modifier is needed here.
 * @public
 */
export type WithState<I, S> = I & { state: S };

export type InstanceReadonlyState<
  T extends StateContainerConstructor = StateContainerConstructor,
> = WithState<InstanceType<T>, ExtractState<T>>;

export type InstanceState<
  T extends StateContainerConstructor = StateContainerConstructor,
> = WithState<InstanceType<T>, ExtractStateMutable<T>>;

export type StateContainerInstance<S extends object = any> = WithState<
  StateContainer<S, any, any>,
  Readonly<S>
>;

/**
 * Extract constructor argument types from a class
 * @typeParam T - The class type
 */
export type ExtractConstructorArgs<T> = T extends new (...args: infer P) => any
  ? P
  : never[];

/**
 * Extract instance type from an abstract class constructor
 * @typeParam T - The abstract class constructor type
 */
export type BlocInstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;

/**
 * Constructor type for StateContainer classes.
 * Used for type-safe hook parameters.
 * @typeParam TBloc - The StateContainer instance type
 */
export type BlocConstructor<
  S extends object = any,
  T extends new (...args: any[]) => StateContainer<S, any, any> = new (
    ...args: any[]
  ) => StateContainer<S, any, any>,
> = (new (...args: any[]) => InstanceType<T>) & {
  keepAlive?: boolean;
};
