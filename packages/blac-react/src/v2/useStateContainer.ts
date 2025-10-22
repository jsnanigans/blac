/**
 * useStateContainer - Simple React hook for v2 StateContainer
 *
 * Clean, minimal hook using React 18's useSyncExternalStore.
 */

import { useSyncExternalStore, useEffect, useMemo } from 'react';
import type { StateContainer } from '../../../blac/src/v2/core/StateContainer';
import { createReactBridge } from './ReactBridge';

/**
 * Options for useStateContainer hook
 */
export interface UseStateContainerOptions<TState> {
  /**
   * Callback when component mounts
   */
  onMount?: (container: StateContainer<TState>) => void;

  /**
   * Callback when component unmounts
   */
  onUnmount?: (container: StateContainer<TState>) => void;
}

/**
 * Hook to subscribe to a StateContainer
 *
 * Uses React 18's useSyncExternalStore for optimal compatibility
 * with Concurrent Mode, Suspense, and Strict Mode.
 *
 * @param container - The StateContainer instance to subscribe to
 * @param options - Optional configuration
 * @returns The current state
 *
 * @example
 * // Basic usage
 * function Counter() {
 *   const counter = useMemo(() => new CounterBloc(), []);
 *   const state = useStateContainer(counter);
 *   return <div>{state.count}</div>;
 * }
 *
 * @example
 * // With lifecycle callbacks
 * function DataLoader() {
 *   const loader = useMemo(() => new DataLoaderBloc(), []);
 *   const data = useStateContainer(loader, {
 *     onMount: (bloc) => bloc.loadData(),
 *     onUnmount: (bloc) => bloc.cleanup(),
 *   });
 *   return <div>{data}</div>;
 * }
 */
export function useStateContainer<TState>(
  container: StateContainer<TState>,
  options?: UseStateContainerOptions<TState>
): TState {
  const { onMount, onUnmount } = options ?? {};

  // Create bridge (memoized per container instance)
  const bridge = useMemo(() => createReactBridge(container), [container]);

  // Subscribe to state changes using React 18's hook
  const state = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot
  );

  // Handle lifecycle callbacks
  useEffect(() => {
    onMount?.(container);

    return () => {
      onUnmount?.(container);
    };
  }, [container, onMount, onUnmount]);

  return state;
}
