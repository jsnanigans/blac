/**
 * Shared type definitions for useBloc implementations
 */

import type { StateContainer, AnyObject, ExtractState } from '@blac/core';
import type { RefObject } from 'react';

/**
 * Options for useBloc hook
 */
export interface UseBlocOptions<
  TBloc extends StateContainer<AnyObject, AnyObject>,
> {
  /**
   * Static props to pass to Bloc constructor
   * Type should match the constructor's first parameter
   */
  staticProps?: AnyObject;

  /**
   * Custom instance ID for shared blocs
   * For isolated blocs, each useBloc call gets its own instance
   */
  instanceId?: string;

  /**
   * Dependencies array to control re-rendering
   */
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];

  /**
   * Control automatic dependency tracking (default: true)
   * - true: Automatically track accessed properties via Proxy
   * - false: Disable automatic tracking, all state changes trigger re-render
   * - Ignored when dependencies option is provided
   */
  autoTrack?: boolean;

  /**
   * Callback when component mounts
   */
  onMount?: (bloc: TBloc) => void;

  /**
   * Callback when component unmounts
   */
  onUnmount?: (bloc: TBloc) => void;
}

/**
 * Component reference object type for internal tracking
 */
export type ComponentRef<TState> = {
  __blocInstanceId?: string;
  __bridge?: any; // Bridge type varies by implementation
};

/**
 * Return type returns full state
 */
export type UseBlocReturn<TBloc extends StateContainer<AnyObject, AnyObject>> =
  [ExtractState<TBloc>, TBloc, RefObject<ComponentRef<ExtractState<TBloc>>>];
