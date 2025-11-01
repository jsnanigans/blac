/**
 * Type definitions for @blac/react
 */

import type { StateContainer, AnyObject, ExtractState } from '@blac/core';
import type { RefObject } from 'react';

/**
 * Configuration options for the useBloc hook
 *
 * @template TBloc - The StateContainer type
 *
 * @example
 * ```tsx
 * const [state, bloc] = useBloc(CounterBloc, {
 *   staticProps: { initialCount: 0 },
 *   dependencies: (state) => [state.count],
 *   onMount: (bloc) => console.log('Mounted'),
 * });
 * ```
 */
export interface UseBlocOptions<TBloc extends StateContainer<AnyObject>> {
  /**
   * Static props to pass to the Bloc constructor
   * Type should match the constructor's first parameter
   */
  staticProps?: AnyObject;

  /**
   * Custom instance ID for shared blocs
   * - For isolated blocs, each useBloc call gets its own instance
   * - For shared blocs, the same instanceId will share the same bloc instance
   */
  instanceId?: string;

  /**
   * Manual dependency tracking function
   * - When provided, automatic proxy tracking is disabled
   * - Component only re-renders when the returned values change (shallow equality)
   *
   * @param state - Current state of the bloc
   * @param bloc - The bloc instance
   * @returns Array of values to track
   */
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];

  /**
   * Control automatic dependency tracking (default: true)
   * - true: Automatically track accessed properties via Proxy
   * - false: Disable tracking, all state changes trigger re-render
   * - Ignored when `dependencies` option is provided
   *
   * @default true
   */
  autoTrack?: boolean;

  /**
   * Callback invoked when the component mounts
   *
   * @param bloc - The bloc instance
   */
  onMount?: (bloc: TBloc) => void;

  /**
   * Callback invoked when the component unmounts
   *
   * @param bloc - The bloc instance
   */
  onUnmount?: (bloc: TBloc) => void;
}

/**
 * Return type of the useBloc hook
 *
 * @template TBloc - The StateContainer type
 *
 * @returns A tuple containing:
 * - [0]: The current state (may be a Proxy for tracking)
 * - [1]: The bloc instance with methods
 * - [2]: Component ref (internal use only)
 */
export type UseBlocReturn<TBloc extends StateContainer<AnyObject>> = [
  ExtractState<TBloc>,
  TBloc,
  RefObject<ComponentRef>,
];

/**
 * @internal
 * Component reference object for internal tracking
 * Used to persist instance IDs across React Strict Mode remounts
 */
export type ComponentRef = {
  __blocInstanceId?: string;
  __bridge?: any;
};
