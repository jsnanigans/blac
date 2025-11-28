import type { ExtractState } from '@blac/core';
import type { RefObject } from 'react';

/**
 * Configuration options for useBloc hook
 * @template TBloc - The state container type
 * @template TProps - Props type passed to the container
 */
export interface UseBlocOptions<TBloc, TProps = any> {
  /** Props passed to bloc constructor or updateProps */
  props?: TProps;
  /** Custom instance identifier for shared or isolated instances */
  instanceId?: string | number;
  /** Manual dependency array like useEffect (disables autoTrack) */
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  /** Enable automatic property tracking via Proxy (default: true) */
  autoTrack?: boolean;
  /** Disable caching for getter tracking */
  disableGetterCache?: boolean;
  /** Callback invoked when bloc instance mounts */
  onMount?: (bloc: TBloc) => void;
  /** Callback invoked when bloc instance unmounts */
  onUnmount?: (bloc: TBloc) => void;
}

/**
 * UseBlocOptions variant with required manual dependencies
 * @template TBloc - The state container type
 * @template TProps - Props type passed to the container
 */
export interface UseBlocOptionsWithDependencies<TBloc, TProps = any>
  extends UseBlocOptions<TBloc, TProps> {
  /** Required manual dependency array */
  dependencies: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  /** autoTrack is not allowed when dependencies are provided */
  autoTrack?: never;
}

/**
 * Tuple return type from useBloc hook containing state, bloc instance, and ref
 * - [0] Current state value
 * - [1] State container instance (bloc) for calling actions
 * - [2] Ref object for accessing component ref (advanced use cases)
 */
export type UseBlocReturn<TBloc> = [
  ExtractState<TBloc>,
  TBloc,
  RefObject<ComponentRef>,
];

/**
 * Internal ref structure for component-bloc binding
 * @internal
 */
export type ComponentRef = {
  /** Cached bloc instance ID for this component */
  __blocInstanceId?: string;
  /** Bridge connection for DevTools (if available) */
  __bridge?: any;
};
