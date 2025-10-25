/**
 * Utility types for working with StateContainer and Bloc classes
 * These types are framework-agnostic and can be used by any integration
 */

import type { StateContainer } from '../core/StateContainer';
import type { AnyObject } from './branded';

/**
 * Extract state type from StateContainer
 *
 * @example
 * ```ts
 * class CounterBloc extends Cubit<number> { ... }
 * type State = ExtractState<CounterBloc>; // number
 * ```
 */
export type ExtractState<T> = T extends StateContainer<infer S, AnyObject>
  ? S
  : never;

/**
 * Extract constructor parameter types from a Bloc class
 *
 * @example
 * ```ts
 * class UserBloc extends Cubit<UserState> {
 *   constructor(userId: string, config: Config) { ... }
 * }
 * type Args = ExtractConstructorArgs<typeof UserBloc>; // [string, Config]
 * ```
 */
export type ExtractConstructorArgs<T> = T extends new (
  ...args: infer P
) => AnyObject
  ? P
  : never[];

/**
 * Bloc constructor type - represents a class constructor for StateContainer subclasses
 * Includes static methods from StateContainer for instance management
 *
 * Note: Uses `any` for state/event types to support variance - the actual Bloc instance
 * will have the correct specific types inferred at usage sites.
 *
 * @example
 * ```ts
 * function createBloc<TBloc extends StateContainer<any, any>>(
 *   BlocClass: BlocConstructor<TBloc>
 * ): TBloc {
 *   return BlocClass.getOrCreate();
 * }
 * ```
 */
export type BlocConstructor<
  TBloc extends StateContainer<any, any>,
> = (new (...args: any[]) => TBloc) & {
  getOrCreate?(instanceKey?: string, ...args: any[]): TBloc;
  release?(instanceKey?: string): void;
  isolated?: boolean;
  keepAlive?: boolean;
};
