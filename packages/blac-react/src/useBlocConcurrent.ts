/**
 * useBlocConcurrent - Optimized concurrent mode implementation using useSyncExternalStore
 *
 * This implementation uses ReactBridge for automatic dependency tracking with
 * performance optimizations:
 * - Single useMemo for initialization (reduces allocations)
 * - Optimized lifecycle management with fewer effects
 * - Efficient dependency comparison when using manual dependencies
 */

import { useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  StateContainer,
  type AnyObject,
  type ExtractState,
  type BlocConstructor,
} from '@blac/core';
import { ReactBridge } from './ReactBridge.optimized';
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
 * useBlocConcurrent - Concurrent mode hook using useSyncExternalStore with ReactBridge
 *
 * @param BlocClass - The Bloc constructor
 * @param options - Optional configuration
 * @returns Tuple of [state, bloc, componentRef]
 */
export function useBlocConcurrent<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef<ExtractState<TBloc>>>({});

  // Single useMemo for ALL initialization - minimize allocations
  const [bloc, bridge, instanceKey] = useMemo(() => {
    const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    // Generate instance key efficiently
    let instanceId: string | undefined = options?.instanceId;

    if (!instanceId && isIsolated) {
      if (!componentRef.current.__blocInstanceId) {
        componentRef.current.__blocInstanceId = `isolated-${Math.random().toString(36).slice(2, 11)}`;
      }
      instanceId = componentRef.current.__blocInstanceId;
    }

    // Get or create bloc instance
    const blocInstance = Constructor.getOrCreate(
      instanceId,
      options?.staticProps,
    );

    // Create bridge only once
    if (!componentRef.current.__bridge) {
      const deps = options?.dependencies;
      componentRef.current.__bridge = new ReactBridge(blocInstance, {
        dependencies: deps ? (state) => deps(state, blocInstance) : undefined,
      });
    }

    return [blocInstance, componentRef.current.__bridge, instanceId];
  }, []); // Empty deps - stable for component lifetime

  // Subscribe to state changes using useSyncExternalStore
  const state = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  // Complete tracking after each render
  useEffect(() => {
    bridge.completeTracking();
  }); // No dependencies - runs after every render

  // Mount/unmount lifecycle - optimized with single effect
  useEffect(() => {
    // Call onMount callback if provided
    bridge.onMount(options?.onMount as any);

    return () => {
      // Call onUnmount callback if provided
      bridge.onUnmount(options?.onUnmount as any);

      // Release reference using StateContainer's static release method
      const Constructor = BlocClass as StateContainerConstructor<TBloc>;
      Constructor.release(instanceKey);

      // Cleanup bridge for isolated instances
      const isIsolated =
        (BlocClass as { isolated?: boolean }).isolated === true;
      if (isIsolated) {
        bridge.dispose();
        componentRef.current.__bridge = undefined;
      }
    };
  }, []); // Only run on mount/unmount

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>;
}
