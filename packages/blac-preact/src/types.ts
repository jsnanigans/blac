import type { ExtractState, StateContainerConstructor } from '@blac/core';
import { InstanceReadonlyState } from '@blac/core';
import type { RefObject } from 'preact';

/**
 * Configuration options for useBloc hook
 * @template TBloc - The state container type
 */
export interface UseBlocOptions<TBloc extends StateContainerConstructor> {
  /** Custom instance identifier for shared or isolated instances */
  instanceId?: string | number;
  /** Manual dependency array like useEffect (disables autoTrack) */
  dependencies?: (
    state: ExtractState<TBloc>,
    bloc: InstanceReadonlyState<TBloc>,
  ) => unknown[];
  /** Enable automatic property tracking via Proxy (default: true) */
  autoTrack?: boolean;
  /** Disable caching for getter tracking */
  disableGetterCache?: boolean;
  /** Callback invoked when bloc instance mounts */
  onMount?: (bloc: InstanceType<TBloc>) => void;
  /** Callback invoked when bloc instance unmounts */
  onUnmount?: (bloc: InstanceType<TBloc>) => void;
}

/**
 * Tuple return type from useBloc hook containing state, bloc instance, and ref
 * - [0] Current state value (with optional state type override)
 * - [1] State container instance (bloc) for calling actions
 * - [2] Ref object for accessing component ref (advanced use cases)
 *
 * @template TBloc - The state container type
 */
export type UseBlocReturn<
  TBloc extends StateContainerConstructor,
  S = ExtractState<TBloc>,
> = [S, InstanceReadonlyState<TBloc>, RefObject<ComponentRef>];

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
