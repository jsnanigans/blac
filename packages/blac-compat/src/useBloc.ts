import { useEffect, useRef } from 'react';
import { useBloc as v2UseBloc } from '@blac/react';
import type { UseBlocOptions } from '@blac/react';
import type {
  ExtractState,
  InstanceReadonlyState,
  StateContainerConstructor,
} from '@blac/core';

/**
 * v1 `useBloc` options. Only the subset used in `user-fe-reviews` is mapped;
 * unknown options are ignored.
 */
export interface V1UseBlocOptions<TBloc extends StateContainerConstructor> {
  /** v1 instance id (was named `id`, not `instanceId`). */
  id?: string | number;
  /** v1 manual-deps selector — same shape as v2's `select`. */
  dependencySelector?: (
    state: ExtractState<TBloc>,
    bloc: InstanceReadonlyState<TBloc>,
  ) => unknown[];
  /** v1 mount callback — forwarded to v2 `onMount`. */
  onMount?: (bloc: InstanceType<TBloc>) => void;
  /** Legacy props slot. Injected once on mount via `initWithProps`/`bloc.props`. */
  props?: unknown;
}

export type V1UseBlocReturn<TBloc extends StateContainerConstructor> =
  readonly [ExtractState<TBloc>, InstanceReadonlyState<TBloc>];

/**
 * v1 `useBloc` adapter. Maps v1 option names to v2's, drops the ref slot
 * from the return tuple, and emulates v1's lifecycle of populating
 * `bloc.props` once on mount.
 *
 * Caveat: the `props` handling fires on mount only. The codemod removes this
 * branch in Phase 2 by rewriting call sites to the explicit
 * `useEffect(() => bloc.initWithProps(props), [])` pattern (see
 * `03-risks-and-edge-cases.md#r3`).
 */
export function useBloc<TBloc extends StateContainerConstructor>(
  BlocClass: TBloc,
  options?: V1UseBlocOptions<TBloc>,
): V1UseBlocReturn<TBloc> {
  // Map v1's `id` (raw string key) to a stable args object so v2's `useBloc`
  // can derive a consistent instance key. Using `_compat_id` as the property
  // name ensures different v1 ids produce different instances and that the
  // compat BlocProvider's args match when no explicit `id` is given.
  // Cast at the adapter boundary; v1 blocs always used the default `void` Args.
  const compatArgs =
    options?.id !== undefined ? { _compat_id: String(options.id) } : undefined;
  const [state, bloc] = v2UseBloc(BlocClass, {
    ...(compatArgs !== undefined ? { args: compatArgs } : {}),
    select: options?.dependencySelector,
    onMount: options?.onMount,
  } as UseBlocOptions<TBloc>);

  // Always run a useEffect on mount — branching inside keeps hook order stable
  // even if a caller toggles `options.props` between defined/undefined.
  const propsRef = useRef(options?.props);
  propsRef.current = options?.props;

  useEffect(() => {
    const initial = propsRef.current;
    if (initial === undefined) return;
    const withInit = bloc as unknown as {
      initWithProps?: (p: unknown) => void;
      props?: unknown;
    };
    if (typeof withInit.initWithProps === 'function') {
      withInit.initWithProps(initial);
    } else {
      withInit.props = initial;
    }
    // Intentionally mount-only — matches v1's single-construction lifecycle.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [bloc]);

  return [state, bloc] as const;
}
