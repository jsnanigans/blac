/**
 * useBloc - Convenient hook for BlaC state management in React with automatic proxy tracking
 *
 * Modern ergonomics: pass the Bloc constructor, get type-safe state and instance.
 * No manual selectors needed - automatically tracks which properties you access!
 *
 * @example
 * ```tsx
 * // Basic usage - automatic tracking of accessed properties
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>  // Only re-renders when count changes
 *       <button onClick={bloc.increment}>+</button>
 *     </div>
 *   );
 * }
 *
 * // With static props (for blocs that need initialization)
 * function UserProfile({ userId }: { userId: string }) {
 *   const [state, bloc] = useBloc(UserBloc, {
 *     staticProps: { userId },
 *     onMount: (bloc) => bloc.loadUser(),
 *   });
 *   return <div>{state.name}</div>;  // Only re-renders when name changes
 * }
 * ```
 */

import { useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import type { StateContainer } from '../../../blac/src/v2/core/StateContainer';
import { ReactBridge } from './ReactBridge';

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
any,
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
 * useBloc Hook - Modern, type-safe BlaC state management with automatic proxy tracking
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
  const componentRef = useRef<object & { __blocInstanceId?: string; __bridge?: ReactBridge<any> }>({});

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

  // Get or create bloc instance and bridge
  const { bloc, bridge } = useMemo(() => {
    const blocInstance = getOrCreateBloc(BlocClass, instanceKey, options?.staticProps);

    // Create or reuse bridge
    if (!componentRef.current.__bridge) {
      componentRef.current.__bridge = new ReactBridge(blocInstance);
    }

    return {
      bloc: blocInstance,
      bridge: componentRef.current.__bridge
    };
  }, [BlocClass, instanceKey, options?.staticProps]);

  // Subscribe to state changes using useSyncExternalStore with proxy tracking
  const state = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot
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
    bridge.onMount(options?.onMount);

    return () => {
      // Call onUnmount callback if provided
      bridge.onUnmount(options?.onUnmount);

      // Release reference - isolated blocs always dispose when ref count hits zero
      releaseBloc(instanceKey, isIsolated);

      // Cleanup bridge if isolated
      if (isIsolated) {
        bridge.dispose();
        componentRef.current.__bridge = undefined;
      }
    };
  }, [bridge, instanceKey, isIsolated, options?.onMount, options?.onUnmount]);

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>
}

export default useBloc;
export { useBloc };
