import type {
  ExtractArgs,
  ExtractState,
  InstanceReadonlyState,
  StateContainerConstructor,
} from '@blac/core';
import type { RefObject } from 'react';

/**
 * Conditional `args` field:
 * - When the bloc uses the default `void` Args: args is forbidden (type `never`).
 * - When the bloc declares Args: args is optional (may be inherited from a
 *   `BlocProvider` ancestor at runtime; omitting it resolves to the provider
 *   args or the default key).
 */
type ArgsOption<T extends StateContainerConstructor> =
  ExtractArgs<T> extends void ? { args?: never } : { args?: ExtractArgs<T> };

/**
 * Configuration options for {@link useBloc}.
 *
 * @template TBloc - The state container constructor type
 *
 * @remarks
 * Instance identity is derived entirely from `args`. For a per-mount private
 * instance, pass a stable unique object: `{ args: { _id: useId() } }`.
 *
 * To re-render on a fixed set of values rather than on auto-tracked reads, pass
 * `select` — it returns a tuple/array that is compared per-index via
 * `Object.is`.
 */
export type UseBlocOptions<TBloc extends StateContainerConstructor> =
  ArgsOption<TBloc> & {
    /**
     * Per-consumer re-render selector. When provided, the hook re-renders
     * only when the returned array's elements change (Object.is per index).
     * When omitted, auto-tracking is used: any state path read during the
     * render is observed, and the hook re-renders when any of those paths
     * change.
     *
     * Keep the selector referentially stable across renders (e.g. via
     * `useCallback`) — passing a fresh function each render forces the
     * subscription to re-key, which the underlying channel treats as a new
     * consumer.
     */
    select?: (
      state: ExtractState<TBloc>,
      bloc: InstanceReadonlyState<TBloc>,
    ) => unknown[];
    /** Callback invoked when this consumer mounts. */
    onMount?: (bloc: InstanceType<TBloc>) => void;
    /**
     * Callback invoked when this consumer unmounts. Fires *before* the
     * registry releases its ref, so the bloc is still alive when this runs.
     */
    onUnmount?: (bloc: InstanceType<TBloc>) => void;
  };

/**
 * Tuple return type from {@link useBloc}.
 * - [0] Current state value
 * - [1] State container instance (bloc) for calling actions
 * - [2] Ref object for accessing component ref (advanced use cases)
 *
 * @template TBloc - The state container constructor type
 */
export type UseBlocReturn<
  TBloc extends StateContainerConstructor,
  S = ExtractState<TBloc>,
> = [S, InstanceReadonlyState<TBloc>, RefObject<ComponentRef>];

/**
 * Internal ref structure for component-bloc binding.
 * @internal
 */
export type ComponentRef = Record<string, never>;
