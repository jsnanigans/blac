import { useMemo, useEffect, useRef } from 'react';
import {
  type BlocConstructor,
  StateContainer,
  isIsolatedClass,
} from '@blac/core';
import type { ComponentRef } from './types';
import { generateInstanceKey } from './utils/instance-keys';

type StateContainerConstructor<TBloc extends StateContainer<any, any>> =
  BlocConstructor<TBloc> & {
    resolve(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

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
 * @template T - The state container constructor type
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
 */
export function useBlocActions<
  T extends new (...args: any[]) => StateContainer<any, any>,
>(
  BlocClass: T & BlocConstructor<InstanceType<T>>,
  options?: UseBlocActionsOptions<InstanceType<T>>,
): InstanceType<T> {
  type TBloc = InstanceType<T>;
  const componentRef = useRef<ComponentRef>({});
  const initialPropsRef = useRef(options?.props);

  const [bloc, instanceKey] = useMemo(() => {
    const isIsolated = isIsolatedClass(BlocClass);
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    const instanceKey = generateInstanceKey(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    const instance = Constructor.resolve(instanceKey, initialPropsRef.current);

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

      const Constructor = BlocClass as StateContainerConstructor<TBloc>;
      Constructor.release(instanceKey);

      if (isIsolatedClass(BlocClass) && !bloc.isDisposed) {
        bloc.dispose();
      }
    };
  }, []);

  return bloc;
}
