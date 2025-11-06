import { useMemo, useEffect, useRef } from 'react';
import type { BlocConstructor, StateContainer } from '@blac/core';
import type { ComponentRef } from './types';

type StateContainerConstructor<TBloc extends StateContainer<any>> =
  BlocConstructor<TBloc> & {
    resolve(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

export interface UseBlocActionsOptions<TBloc extends StateContainer<any>> {
  staticProps?: any;
  instanceId?: string | number;
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
}

function generateInstanceId(
  componentRef: ComponentRef,
  isIsolated: boolean,
  providedId?: string | number,
): string | undefined {
  if (providedId !== undefined) {
    // Convert number to string
    return typeof providedId === 'number' ? String(providedId) : providedId;
  }

  if (isIsolated) {
    if (!componentRef.__blocInstanceId) {
      componentRef.__blocInstanceId = `isolated-${Math.random().toString(36).slice(2, 11)}`;
    }
    return componentRef.__blocInstanceId;
  }

  return undefined;
}

export function useBlocActions<TBloc extends StateContainer<any>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocActionsOptions<TBloc>,
): TBloc {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef>({});

  const [bloc, instanceKey] = useMemo(() => {
    const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    // Generate instance key
    const instanceId = generateInstanceId(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    // Get or create bloc instance with ownership (increments ref count)
    const instance = options?.staticProps
      ? Constructor.resolve(instanceId, options.staticProps)
      : Constructor.resolve(instanceId);

    return [instance, instanceId] as const;
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
      const isIsolated =
        (BlocClass as { isolated?: boolean }).isolated === true;
      if (isIsolated && !bloc.isDisposed) {
        bloc.dispose();
      }
    };
  }, []);

  return bloc;
}
