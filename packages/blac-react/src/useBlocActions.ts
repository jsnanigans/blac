import { useMemo, useEffect, useRef } from 'react';
import {
  type BlocConstructor,
  type StateOverride,
  StateContainer,
  isIsolatedClass,
} from '@blac/core';
import type { ComponentRef } from './types';
import { generateInstanceKey } from './utils/instance-keys';

/**
 * Configuration options for useBlocActions hook
 * @template TBloc - The state container type
 * @template TProps - Props type passed to the container
 */
export interface UseBlocActionsOptions<TBloc, TProps = any> {
  /** Props passed to bloc constructor or updateProps */
  props?: TProps;
  /** Custom instance identifier for shared or isolated instances */
  instanceId?: string | number;
  /** Callback invoked when bloc instance mounts */
  onMount?: (bloc: TBloc) => void;
  /** Callback invoked when bloc instance unmounts */
  onUnmount?: (bloc: TBloc) => void;
}

/**
 * React hook that connects to a state container instance without triggering re-renders.
 * Use this when you only need to call actions on the bloc without subscribing to state changes.
 *
 * @template S - Optional state type override for generic StateContainers (defaults to never)
 * @template T - The state container constructor type (inferred from BlocClass)
 * @param BlocClass - The state container class to connect to
 * @param options - Configuration options for instance management and lifecycle
 * @returns The state container instance for calling actions
 *
 * @example Basic usage
 * ```ts
 * const myBloc = useBlocActions(MyBloc);
 * // Call methods on the bloc without re-rendering
 * myBloc.someMethod();
 * ```
 *
 * @example With isolated instance
 * ```ts
 * const myBloc = useBlocActions(MyBloc, {
 *   instanceId: 'unique-id'
 * });
 * ```
 *
 * @example With generic bloc and explicit state type
 * ```ts
 * const myBloc = useBlocActions<MyStateType>(GenericBloc);
 * // myBloc.state is typed as MyStateType
 * ```
 */
export function useBlocActions<
  S = never,
  T extends new (...args: any[]) => StateContainer<any, any> = new (
    ...args: any[]
  ) => StateContainer<any, any>,
>(
  BlocClass: T & BlocConstructor<InstanceType<T>>,
  options?: UseBlocActionsOptions<InstanceType<T>>,
): StateOverride<InstanceType<T>, S> {
  const componentRef = useRef<ComponentRef>({});
  const initialPropsRef = useRef(options?.props);

  const [bloc, instanceKey] = useMemo(() => {
    const isIsolated = isIsolatedClass(BlocClass);

    const instanceKey = generateInstanceKey(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    const instance = BlocClass.resolve(instanceKey, initialPropsRef.current);

    return [instance, instanceKey] as const;
  }, [BlocClass]);

  useEffect(() => {
    if (options?.onMount) {
      options.onMount(bloc);
    }

    return () => {
      if (options?.onUnmount) {
        options.onUnmount(bloc);
      }

      BlocClass.release(instanceKey);

      if (isIsolatedClass(BlocClass) && !bloc.isDisposed) {
        bloc.dispose();
      }
    };
  }, []);

  return bloc as StateOverride<InstanceType<T>, S>;
}
