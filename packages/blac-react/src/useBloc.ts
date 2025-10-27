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

import {
  useMemo,
  useEffect,
  useRef,
  useSyncExternalStore,
  type MutableRefObject,
} from 'react';
import {
  StateContainer,
  type AnyObject,
  type ExtractState,
  type BlocConstructor,
} from '@blac/core';
import { ReactBridge } from './ReactBridge';

/**
 * Options for useBloc hook
 */
export interface UseBlocOptions<
  TBloc extends StateContainer<AnyObject, AnyObject>,
> {
  /**
   * Static props to pass to Bloc constructor
   * Type should match the constructor's first parameter
   */
  staticProps?: AnyObject;

  /**
   * Custom instance ID for shared blocs
   * For isolated blocs, each useBloc call gets its own instance
   */
  instanceId?: string;

  /**
   * Dependencies array to control re-rendering
   */
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];

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
 * Component reference object type for internal tracking
 */
type ComponentRef<TState> = {
  __blocInstanceId?: string;
  __bridge?: ReactBridge<TState>;
};

/**
 * StateContainer constructor with required static methods
 * All StateContainer subclasses have these methods, so we can safely require them
 */
type StateContainerConstructor<TBloc extends StateContainer<any, any>> =
  BlocConstructor<TBloc> & {
    getOrCreate(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

/**
 * Return type returns full state
 */
type UseBlocReturn<TBloc extends StateContainer<AnyObject, AnyObject>> = [
  ExtractState<TBloc>,
  TBloc,
  MutableRefObject<ComponentRef<ExtractState<TBloc>>>,
];

/**
 * useBloc Hook - Modern, type-safe BlaC state management with automatic proxy tracking
 *
 * @param BlocClass - The Bloc constructor (uninitiated class)
 * @param options - Optional configuration
 * @returns Tuple of [state, bloc, componentRef]
 */
function useBloc<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {
  console.log(`[useBloc] ROOT bloc: ${BlocClass.name}`);
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef<ExtractState<TBloc>>>({});

  const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;

  // Generate stable instance key
  const instanceKey = useMemo(() => {
    console.log(
      `[useBloc] Generating instance key for bloc: ${BlocClass.name}`,
    );
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
    console.log(
      `[useBloc] Obtained bloc instance: ${BlocClass.name} (key: ${instanceKey})`,
    );

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
    console.log(`[useBloc] Completed tracking for bloc: ${BlocClass.name}`);
  }); // No dependencies - runs after every render

  // Mount/unmount lifecycle
  useEffect(() => {
    console.log(
      `[useBloc] Mounting bloc: ${BlocClass.name} (key: ${instanceKey})`,
    );
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

export default useBloc;
export { useBloc };
