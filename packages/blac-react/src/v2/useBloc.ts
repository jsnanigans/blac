/**
 * useBloc - Convenient hook for BlaC state management in React
 *
 * Modern ergonomics: pass the Bloc constructor, get type-safe state and instance.
 * No manual type annotations or string names needed - everything is inferred.
 *
 * @example
 * ```tsx
 * // Basic usage - types are inferred automatically
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>
 *       <button onClick={bloc.increment}>+</button>
 *     </div>
 *   );
 * }
 *
 * // With static props (for blocs that need initialization)
 * function UserProfile({ userId }: { userId: string }) {
 *   const [user, bloc] = useBloc(UserBloc, {
 *     staticProps: { userId },
 *     onMount: (bloc) => bloc.loadUser(),
 *   });
 *   return <div>{user.name}</div>;
 * }
 */

import { useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import type { StateContainer } from '../../../blac/src/v2/core/StateContainer';

/**
 * Extract state type from StateContainer
 */
type ExtractState<T> = T extends StateContainer<infer S, any> ? S : never;

/**
 * Bloc constructor type - more flexible to accept any StateContainer subclass
 */
type BlocConstructor<TBloc = any> = new (...args: any[]) => TBloc;

/**
 * Options for useBloc hook
 */
export interface UseBlocOptions<TBloc extends StateContainer<any, any>> {
  /**
   * Static props to pass to Bloc constructor
   */
  staticProps?: any;

  /**
   * Custom instance ID for shared blocs
   * For isolated blocs, each useBloc call gets its own instance
   */
  instanceId?: string;

  /**
   * Callback when component mounts
   */
  onMount?: (bloc: TBloc) => void;

  /**
   * Callback when component unmounts
   */
  onUnmount?: (bloc: TBloc) => void;
}

/**
 * Return type returns full state
 */
type UseBlocReturn<TBloc extends StateContainer<any, any>> = [
  ExtractState<TBloc>,
  TBloc,
];

/**
 * Instance storage with reference counting
 */
interface BlocInstanceEntry {
  bloc: StateContainer<any, any>;
  refCount: number;
}

const blocInstances = new Map<string, BlocInstanceEntry>();

/**
 * Get or create a bloc instance
 */
function getOrCreateBloc<TBloc extends StateContainer<any, any>>(
  BlocClass: BlocConstructor<TBloc>,
  instanceKey: string,
  staticProps?: any
): TBloc {
  const existing = blocInstances.get(instanceKey);
  if (existing) {
    existing.refCount++;
    return existing.bloc as TBloc;
  }

  // Create new instance
  const instance = staticProps
    ? new BlocClass(staticProps)
    : new BlocClass();

  blocInstances.set(instanceKey, {
    bloc: instance,
    refCount: 1,
  });

  return instance;
}

/**
 * Release a bloc instance reference
 */
function releaseBloc(instanceKey: string, shouldDispose: boolean): void {
  const entry = blocInstances.get(instanceKey);
  if (!entry) return;

  entry.refCount--;

  // Only dispose if ref count is zero and we should dispose
  if (entry.refCount <= 0 && shouldDispose) {
    entry.bloc.dispose();
    blocInstances.delete(instanceKey);
  }
}

/**
 * Clear all bloc instances (for testing)
 */
export function clearAllBlocInstances(): void {
  for (const entry of blocInstances.values()) {
    entry.bloc.dispose();
  }
  blocInstances.clear();
}

/**
 * useBloc Hook - Modern, type-safe BlaC state management
 *
 * @param BlocClass - The Bloc constructor (uninitiated class)
 * @param options - Optional configuration
 * @returns Tuple of [state, bloc]
 */
function useBloc<TBloc extends StateContainer<any, any>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>
): UseBlocReturn<TBloc> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<object & { __blocInstanceId?: string }>({});

  // Check if bloc is isolated
  const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;

  // Generate stable instance key
  const instanceKey = useMemo(() => {
    // Custom instance ID takes precedence
    if (options?.instanceId) {
      return `${BlocClass.name}:${options.instanceId}`;
    }

    // For isolated blocs, generate unique ID per component
    if (isIsolated) {
      if (!componentRef.current.__blocInstanceId) {
        componentRef.current.__blocInstanceId = `${BlocClass.name}:isolated-${Math.random().toString(36).slice(2, 11)}`;
      }
      return componentRef.current.__blocInstanceId;
    }

    // For shared blocs, use class name as default
    return BlocClass.name;
  }, [BlocClass, options?.instanceId, isIsolated]);

  // Get or create bloc instance
  const bloc = useMemo(() => {
    return getOrCreateBloc(BlocClass, instanceKey, options?.staticProps);
  }, [BlocClass, instanceKey, options?.staticProps]);

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Subscribe to state changes - just notify React to check getSnapshot
      const unsubscribe = bloc.subscribe(() => {
        onStoreChange();
      });

      return unsubscribe;
    },
    [bloc]
  );

  // Snapshot function for useSyncExternalStore
  // useSyncExternalStore will handle comparison using Object.is
  const getSnapshot = useCallback(() => {
    const state = bloc.state;
    const selected = state;

    // But useSyncExternalStore uses Object.is by default which is usually fine
    return selected;
  }, [bloc]);

  // Server snapshot (same as client for now)
  const getServerSnapshot = getSnapshot;

  // Subscribe to state changes using useSyncExternalStore
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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

      // Release reference - isolated blocs always dispose when ref count hits zero
      releaseBloc(instanceKey, isIsolated);
    };
  }, [bloc, instanceKey, isIsolated]);

  return [state, bloc] as UseBlocReturn<TBloc>
}

export default useBloc;
export { useBloc };
