/**
 * useBloc - Convenient hook that combines BlocRegistry with useStateContainer
 *
 * Automatically manages bloc instances via the registry while subscribing to state changes.
 */

import { useMemo, useEffect } from 'react';
import type { StateContainer } from '../../../blac/src/v2/core/StateContainer';
import { BlocRegistry, createInstanceId, type BlocFactory } from '../../../blac/src/v2/registry';
import { useStateContainer, type UseStateContainerOptions } from './useStateContainer';

/**
 * Options for useBloc hook
 */
export interface UseBlocOptions<TState> extends UseStateContainerOptions<TState> {
  /**
   * Custom instance ID (optional)
   * For shared blocs, same ID returns same instance
   * For isolated blocs, each call creates new instance
   */
  id?: string;

  /**
   * Whether to automatically dispose the bloc on unmount
   * Default: true for isolated blocs, false for shared blocs
   */
  autoDispose?: boolean;
}

/**
 * Global registry instance
 * In a real app, this would be provided via context
 */
let globalRegistry: BlocRegistry | null = null;

/**
 * Set the global BlocRegistry instance
 */
export function setBlocRegistry(registry: BlocRegistry): void {
  globalRegistry = registry;
}

/**
 * Get the global BlocRegistry instance
 */
export function getBlocRegistry(): BlocRegistry {
  if (!globalRegistry) {
    throw new Error(
      'BlocRegistry not initialized. Call setBlocRegistry() before using useBloc.'
    );
  }
  return globalRegistry;
}

/**
 * Register a bloc type with the global registry
 *
 * @param typeName - Unique name for this bloc type
 * @param factory - Factory function to create instances
 * @param isolated - Whether instances are isolated (default: false)
 *
 * @example
 * ```tsx
 * // Register a shared bloc (singleton)
 * registerBloc('Counter', (id) => new CounterBloc());
 *
 * // Register an isolated bloc (new instance per consumer)
 * registerBloc('User', (id) => new UserBloc(), true);
 * ```
 */
export function registerBloc<TState, TBloc extends StateContainer<TState>>(
  typeName: string,
  factory: BlocFactory<TState, TBloc>,
  isolated: boolean = false
): void {
  const registry = getBlocRegistry();
  registry.register(typeName, { factory, isolated });
}

/**
 * Hook to use a bloc from the registry
 *
 * Combines instance management (via BlocRegistry) with state subscription
 * (via useStateContainer). Simple and focused.
 *
 * @param typeName - The registered bloc type name
 * @param options - Optional configuration
 * @returns Tuple of [state, bloc instance]
 *
 * @example
 * // Basic usage with shared bloc
 * function Counter() {
 *   const [state, bloc] = useBloc<number, CounterBloc>('Counter');
 *   return (
 *     <div>
 *       <p>Count: {state}</p>
 *       <button onClick={bloc.increment}>+</button>
 *     </div>
 *   );
 * }
 *
 * @example
 * // With custom instance ID
 * function UserProfile({ userId }: { userId: string }) {
 *   const [user, bloc] = useBloc<UserState, UserBloc>('User', {
 *     id: userId,
 *     onMount: (bloc) => bloc.loadUser(userId),
 *   });
 *   return <div>{user.name}</div>;
 * }
 */
export function useBloc<TState, TBloc extends StateContainer<TState>>(
  typeName: string,
  options?: UseBlocOptions<TState>
): [TState, TBloc] {
  const { id = typeName, autoDispose, onMount, onUnmount } = options ?? {};

  const registry = getBlocRegistry();

  // Get or create bloc instance from registry
  const bloc = useMemo(() => {
    const instanceId = createInstanceId(id);
    return registry.get<TState, TBloc>(typeName, instanceId);
  }, [registry, typeName, id]);

  // Subscribe to state changes
  const state = useStateContainer(bloc, { onMount, onUnmount });

  // Handle disposal on unmount if autoDispose is enabled
  useEffect(() => {
    return () => {
      if (autoDispose) {
        bloc.dispose();
        // Also remove from registry
        registry.remove(typeName, createInstanceId(id));
      }
    };
  }, [bloc, autoDispose, registry, typeName, id]);

  return [state, bloc];
}
