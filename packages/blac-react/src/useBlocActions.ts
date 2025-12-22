import { useMemo, useEffect, useRef } from 'react';
import {
  StateContainerConstructor,
  isIsolatedClass,
  acquire,
  release,
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
 * **This is the recommended hook for stateless containers** (StatelessCubit, StatelessVertex).
 * It also works with regular Cubit/Vertex when you don't need state subscriptions.
 *
 * @template T - The state container constructor type (inferred from BlocClass)
 * @param BlocClass - The state container class to connect to (supports both stateful and stateless)
 * @param options - Configuration options for instance management and lifecycle
 * @returns The state container instance for calling actions
 *
 * @example Basic usage with stateless container
 * ```ts
 * class AnalyticsService extends StatelessCubit {
 *   trackEvent(name: string) { ... }
 * }
 *
 * const analytics = useBlocActions(AnalyticsService);
 * analytics.trackEvent('page_view');
 * ```
 *
 * @example With stateful container (no re-renders)
 * ```ts
 * const myBloc = useBlocActions(MyBloc);
 * myBloc.someMethod(); // Won't cause re-renders
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
  T extends StateContainerConstructor = StateContainerConstructor,
>(
  BlocClass: T,
  options?: UseBlocActionsOptions<InstanceType<T>>,
): InstanceType<T> {
  const componentRef = useRef<ComponentRef>({});
  const initialPropsRef = useRef(options?.props);

  const [bloc, instanceKey] = useMemo(() => {
    const isIsolated = isIsolatedClass(BlocClass);

    const instanceKey = generateInstanceKey(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    const instance = acquire(BlocClass, instanceKey, {
      props: initialPropsRef.current,
    });

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

      release(BlocClass, instanceKey);

      if (isIsolatedClass(BlocClass) && !bloc.isDisposed) {
        bloc.dispose();
      }
    };
  }, []);

  return bloc as InstanceType<T>;
}
