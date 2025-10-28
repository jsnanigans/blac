/**
 * useBlocConcurrent - Concurrent mode implementation using useSyncExternalStore
 *
 * This is the original implementation that uses useSyncExternalStore.
 * It provides tearing protection for concurrent features like Suspense,
 * transitions, and deferred values, but has ~4x reconciliation overhead.
 */

import {
  useMemo,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  StateContainer,
  type AnyObject,
  type ExtractState,
  type BlocConstructor,
} from '@blac/core';
import { ReactBridge } from './ReactBridge';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';

/**
 * StateContainer constructor with required static methods
 */
type StateContainerConstructor<TBloc extends StateContainer<any, any>> =
  BlocConstructor<TBloc> & {
    getOrCreate(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

/**
 * useBlocConcurrent - Concurrent mode hook using useSyncExternalStore
 *
 * @param BlocClass - The Bloc constructor
 * @param options - Optional configuration
 * @returns Tuple of [state, bloc, componentRef]
 */
export function useBlocConcurrent<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {

  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef<ExtractState<TBloc>>>({});

  const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;

  // Generate stable instance key
  const instanceKey = useMemo(() => {
    // Custom instance ID takes precedence
    if (options?.instanceId) {
      return options.instanceId;
    }

    // For isolated blocs, generate unique ID per component
    if (isIsolated) {
      if (!componentRef.current.__blocInstanceId) {
        componentRef.current.__blocInstanceId = `isolated-${Math.random().toString(36).slice(2, 11)}`;
      }
      return componentRef.current.__blocInstanceId;
    }

    // For shared blocs, use default (undefined = className)
    return undefined;
  }, [BlocClass, options?.instanceId, isIsolated]);

  const { bloc, bridge } = useMemo(() => {
    // Type assertion: All StateContainer subclasses have these static methods
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    // Use StateContainer's static getOrCreate method
    const blocInstance = Constructor.getOrCreate(
      instanceKey,
      options?.staticProps,
    );

    if (!componentRef.current.__bridge) {
      const deps = options?.dependencies;
      componentRef.current.__bridge = new ReactBridge(blocInstance, {
        dependencies: deps ? (state) => deps(state, blocInstance) : undefined,
      });
    }
    return {
      bloc: blocInstance,
      bridge: componentRef.current.__bridge,
    };
  }, [BlocClass, instanceKey, options?.staticProps, options?.dependencies]);

  // Subscribe to state changes using useSyncExternalStore with proxy tracking
  const state = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  // Complete tracking after each render
  // This effect runs after EVERY render (no dependencies) to ensure tracking
  // is completed after component has accessed state properties
  useEffect(() => {
    bridge.completeTracking();
  }); // No dependencies - runs after every render

  // Mount/unmount lifecycle
  useEffect(() => {
    // Call onMount callback if provided
    // Type assertion: TBloc is compatible with StateContainer
    bridge.onMount(
      options?.onMount as
        | ((container: StateContainer<ExtractState<TBloc>, AnyObject>) => void)
        | undefined,
    );

    return () => {
      // Call onUnmount callback if provided
      // Type assertion: TBloc is compatible with StateContainer
      bridge.onUnmount(
        options?.onUnmount as
          | ((
              container: StateContainer<ExtractState<TBloc>, AnyObject>,
            ) => void)
          | undefined,
      );

      // Release reference using StateContainer's static release method
      // For isolated blocs: disposes when ref count hits zero
      // For shared blocs: only disposes if keepAlive is false and ref count hits zero
      // Type assertion: All StateContainer subclasses have release
      (BlocClass as StateContainerConstructor<TBloc>).release(instanceKey);

      // Cleanup bridge if isolated
      if (isIsolated) {
        bridge.dispose();
        componentRef.current.__bridge = undefined;
      }
    };
  }, [
    bridge,
    instanceKey,
    isIsolated,
    BlocClass,
    options?.onMount,
    options?.onUnmount,
  ]);

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>;
}
