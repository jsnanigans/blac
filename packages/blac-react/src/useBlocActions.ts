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

export interface UseBlocActionsOptions<TBloc, TProps = any> {
  props?: TProps;
  instanceId?: string | number;
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
}

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
