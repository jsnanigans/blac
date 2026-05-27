import type { ExtractState, StateContainerConstructor } from '@blac/core';
import { InstanceReadonlyState } from '@blac/core';
import type { ExtractArgs, ExtractDeps } from '@blac/adapter';
import type { RefObject } from 'react';

/**
 * Conditional `args` field: required when the bloc declares Args, forbidden
 * (type `never`) when the bloc uses the default `void` Args.
 */
type ArgsOption<T extends StateContainerConstructor> =
  ExtractArgs<T> extends void
    ? { args?: never }
    : { args: ExtractArgs<T> };

/**
 * Configuration options for useBloc hook
 * @template TBloc - The state container type
 */
export type UseBlocOptions<TBloc extends StateContainerConstructor> =
  ArgsOption<TBloc> & {
    /** Custom instance identifier */
    instanceId?: string | number;
    /**
     * When true, this call site gets its own per-mount instance, auto-keyed via
     * React's `useId()`. Equivalent to declaring `static isolated = true` on the
     * bloc class. Ignored when an explicit `instanceId` is provided.
     */
    autoInstance?: boolean;
    /** Manual re-render selector (disables autoTrack). Replaces the old `dependencies` option. */
    select?: (
      state: ExtractState<TBloc>,
      bloc: InstanceReadonlyState<TBloc>,
    ) => unknown[];
    /**
     * Per-consumer slice of non-serializable handles (refs, callbacks,
     * controllers) merged into `bloc.deps`. Always partial — each consumer
     * contributes a slice keyed by its stable id. Never affects instance
     * identity; drives the core merge engine + `onDepsChanged`.
     */
    deps?: Partial<ExtractDeps<TBloc>>;
    /** Enable automatic property tracking via Proxy (default: true) */
    autoTrack?: boolean;
    /** Callback invoked when bloc instance mounts */
    onMount?: (bloc: InstanceType<TBloc>) => void;
    /** Callback invoked when bloc instance unmounts */
    onUnmount?: (bloc: InstanceType<TBloc>) => void;
  };

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
export type ComponentRef = Record<string, never>;
