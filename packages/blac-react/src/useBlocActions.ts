import { useMemo, useEffect, useRef } from 'react';
import { type BlocConstructor, StateContainer, isIsolatedClass } from '@blac/core';
import type { ComponentRef } from './types';
import { generateInstanceKey } from './utils/instance-keys';

type StateContainerConstructor<TBloc extends StateContainer<any>> =
  BlocConstructor<TBloc> & {
    resolve(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

export interface UseBlocActionsOptions<TBloc> {
  staticProps?: any;
  instanceId?: string | number;
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
}

export function useBlocActions<
  T extends new (...args: any[]) => StateContainer<any>
>(
  BlocClass: T & BlocConstructor<InstanceType<T>>,
  options?: UseBlocActionsOptions<InstanceType<T>>,
): InstanceType<T> {
  // Component reference that persists across React Strict Mode remounts
  type TBloc = InstanceType<T>;
  const componentRef = useRef<ComponentRef>({});

  const [bloc, instanceKey] = useMemo(() => {
    const isIsolated = isIsolatedClass(BlocClass);
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    // Generate instance key
    const instanceKey = generateInstanceKey(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    // Get or create bloc instance with ownership (increments ref count)
    const instance = options?.staticProps
      ? Constructor.resolve(instanceKey, options.staticProps)
      : Constructor.resolve(instanceKey);

    return [instance, instanceKey] as const;
  }, [BlocClass]);

  // Mount/unmount lifecycle
  useEffect(() => {
    // Call onMount callback if provided
    if (options?.onMount) {
      options.onMount(bloc);
    }

    return () => {
      // Call onUnmount callback if provided
      if (options?.onUnmount) {
        options.onUnmount(bloc);
      }

      // Release bloc reference
      const Constructor = BlocClass as StateContainerConstructor<TBloc>;
      Constructor.release(instanceKey);

      // For isolated instances, dispose manually since registry doesn't track them
      if (isIsolatedClass(BlocClass) && !bloc.isDisposed) {
        bloc.dispose();
      }
    };
  }, []);

  return bloc;
}
