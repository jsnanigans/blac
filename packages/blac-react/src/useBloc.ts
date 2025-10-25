/**
 * useBloc - Convenient hook for BlaC state management in React with automatic proxy tracking
 *
 * Modern ergonomics: pass the Bloc constructor, get type-safe state and instance.
 * Automatically tracks which properties you access!
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
import { StateContainer } from '@blac/core';
import { ReactBridge } from './ReactBridge';

/**
 * Extract state type from StateContainer
 */
type ExtractState<T> = T extends StateContainer<infer S, any> ? S : never;

/**
 * Bloc constructor type - more flexible to accept any StateContainer subclass
 */
type BlocConstructor<TBloc extends StateContainer<any, any>> = new (...args: any[]) => TBloc;

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
   * Dependencies array to control re-rendering
   */
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => any[];

  /**
   * Callback when component mounts
   */
  onMount?: (bloc: TBloc | StateContainer<any, any>) => void;

  /**
   * Callback when component unmounts
   */
  onUnmount?: (bloc: TBloc | StateContainer<any, any>) => void;
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
 * useBloc Hook - Modern, type-safe BlaC state management with automatic proxy tracking
 *
 * @param BlocClass - The Bloc constructor (uninitiated class)
 * @param options - Optional configuration
 * @returns Tuple of [state, bloc]
 */
function useBloc<TBloc extends StateContainer<any, any>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<
    object & { __blocInstanceId?: string; __bridge?: ReactBridge<any> }
  >({});

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
    // Use StateContainer's static getOrCreate method
    const blocInstance = BlocClass.getOrCreate(instanceKey, options?.staticProps);

    if (!componentRef.current.__bridge) {
      componentRef.current.__bridge = new ReactBridge(blocInstance, {
        dependencies: options?.dependencies
          ? (state) => options.dependencies!(state, blocInstance)
          : undefined,
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
    bridge.onMount(options?.onMount);

    return () => {
      // Call onUnmount callback if provided
      bridge.onUnmount(options?.onUnmount);

      // Release reference using StateContainer's static release method
      // For isolated blocs, dispose when ref count hits zero
      // For shared blocs, only dispose if keepAlive is false and ref count hits zero
      if (isIsolated) {
        BlocClass.release(instanceKey); // Will dispose when ref count hits zero
      } else {
        BlocClass.release(instanceKey); // Respects keepAlive setting
      }

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

export default useBloc;
export { useBloc };
