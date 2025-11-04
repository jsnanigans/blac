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
export type ExtractState<T> = T extends StateContainer<infer S> ? S : never;

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
 * Note: Uses `any` for state type to support variance - the actual Bloc instance
 * will have the correct specific types inferred at usage sites.
 *
 * @example
 * ```ts
 * function createBloc<TBloc extends StateContainer<any>>(
 *   BlocClass: BlocConstructor<TBloc>
 * ): TBloc {
 *   // Use .resolve() for ownership (increments ref count)
 *   return BlocClass.resolve();
 * }
 *
 * function borrowBloc<TBloc extends StateContainer<any>>(
 *   BlocClass: BlocConstructor<TBloc>
 * ): TBloc | null {
 *   // Use .getSafe() for conditional access (no ref count change)
 *   const result = BlocClass.getSafe?.();
 *   return result?.error ? null : result.instance;
 * }
 * ```
 */
export type BlocConstructor<TBloc extends StateContainer<any>> = (new (
  ...args: any[]
) => TBloc) & {
  /** Resolve instance with ownership (increments ref count) */
  resolve?(instanceKey?: string, ...args: any[]): TBloc;
  /** Get existing instance without ownership (throws if not found) */
  get?(instanceKey?: string): TBloc;
  /** Get existing instance without ownership (returns discriminated union) */
  getSafe?(
    instanceKey?: string,
  ): { error: Error; instance: null } | { error: null; instance: TBloc };
  /** Release ownership (decrements ref count) */
  release?(instanceKey?: string): void;
  /** Mark as isolated (each component gets its own instance) */
  isolated?: boolean;
  /** Mark as keepAlive (instance survives zero ref count) */
  keepAlive?: boolean;
};
