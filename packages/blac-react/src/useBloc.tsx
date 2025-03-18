import {
  Blac,
  BlocBaseAbstract,
  BlocConstructor,
  BlocGeneric,
  BlocHookDependencyArrayFn,
  BlocState,
  InferPropsFromGeneric,
} from 'blac-next';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import externalBlocStore from './externalBlocStore';

/**
 * Type definition for the return type of the useBloc hook
 * @template B - Bloc constructor type
 */
type HookTypes<B extends BlocConstructor<BlocGeneric>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

/**
 * Configuration options for the useBloc hook
 * @template B - Bloc generic type
 * @property {string} [id] - Optional identifier for the Bloc instance
 * @property {BlocHookDependencyArrayFn<B>} [dependencySelector] - Function to select dependencies for re-renders
 * @property {InferPropsFromGeneric<B>} [props] - Props to pass to the Bloc
 * @property {(bloc: B) => void} [onMount] - Callback function invoked when the Bloc is mounted
 */
export interface BlocHookOptions<B extends BlocGeneric<any, any>> {
  id?: string;
  dependencySelector?: BlocHookDependencyArrayFn<B>;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
}

/**
 * Default dependency selector that wraps the entire state in an array
 * @template T - State type
 * @param {T} s - Current state
 * @returns {Array<Array<T>>} Dependency array containing the entire state
 */
const defaultDependencySelector: BlocHookDependencyArrayFn<any> = (s) => [[s]];

/**
 * React hook for integrating with Blac state management
 * 
 * This hook connects a React component to a Bloc state container, providing
 * automatic re-rendering when relevant state changes, dependency tracking,
 * and proper lifecycle management.
 *
 * @template B - Bloc constructor type
 * @template O - BlocHookOptions type
 * @param {B} bloc - Bloc constructor class
 * @param {O} [options] - Configuration options for the hook
 * @returns {HookTypes<B>} Tuple containing [state, bloc instance]
 * 
 * @example
 * const [state, counterBloc] = useBloc(CounterBloc);
 * // Access state
 * console.log(state.count);
 * // Call bloc methods
 * counterBloc.increment();
 */
export default function useBloc<
  B extends BlocConstructor<BlocGeneric>,
  O extends BlocHookOptions<InstanceType<B>>,
>(bloc: B, options?: O): HookTypes<B> {
  let { dependencySelector, id: blocId, props } = options ?? {};
  const rid = useId();
  
  // Track which state keys are actually used in the component for optimized re-renders
  const usedKeys = useRef<Set<string>>(new Set());
  const instanceKeys = useRef<Set<string>>(new Set());
  const shouldClear = useRef(false);

  // Track used class properties (non-function members) for dependency tracking
  const usedClassPropKeys = useRef<Set<string>>(new Set());
  const instanceClassPropKeys = useRef<Set<string>>(new Set());
  const shouldClearClassProp = useRef(false);

  const renderInstance = new Set();

  // Check if this bloc should be isolated (unique instance per component)
  const base = bloc as unknown as BlocBaseAbstract;
  const isIsolated = base.isolated;
  if (isIsolated) {
    blocId = rid;
  }

  // Get or create the bloc instance with the provided configuration
  const [resolvedBloc, setResolvedBloc] = useState(
    Blac.getInstance().getBloc(bloc, {
      id: blocId,
      props: props as any,
      instanceRef: rid,
    }) as InstanceType<B>,
  );

  if (!resolvedBloc) {
    throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
  }

  // Update props if this is the main instance and props were provided
  const isMainInstance = rid === resolvedBloc._instanceRef;
  if (isMainInstance && options?.props) {
    resolvedBloc.props = options.props;
  }

  // Configure dependency tracking for re-renders
  const dependencyArray: BlocHookDependencyArrayFn<InstanceType<B>> = (
    newState,
    oldState,
  ) => {
    // Use custom dependency selector if provided
    if (dependencySelector) {
      return dependencySelector(newState, oldState);
    }

    // Fall back to bloc's default dependency selector if available
    if (resolvedBloc.defaultDependencySelector) {
      return resolvedBloc.defaultDependencySelector(newState, oldState);
    }

    // For primitive states, use default selector
    if (typeof newState !== 'object') {
      return defaultDependencySelector(newState, oldState);
    }

    // For object states, track which properties were actually used
    const usedState: string[] = [];
    for (const key of usedKeys.current) {
      if (key in newState) {
        usedState.push(newState[key as keyof typeof newState]);
      }
    }

    // Track used class properties for dependency tracking, this enables rerenders when class getters change
    const usedClass: string[] = [];
    for (const key of usedClassPropKeys.current) {
      if (key in resolvedBloc) {
        const value = resolvedBloc[key as keyof InstanceType<B>];
        if (typeof value === 'function') {
          continue;
        }
        usedClass.push(value as any);
      }
    }

    return [usedState, usedClass];
  };

  // Set up external store subscription for state updates
  const { subscribe, getSnapshot, getServerSnapshot } = useMemo(
    () => externalBlocStore(resolvedBloc, dependencyArray, rid),
    [resolvedBloc._createdAt],
  );

  // Subscribe to state changes using React's external store API
  const state = useSyncExternalStore<BlocState<InstanceType<B>>>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Create a proxy for state to track property access
  const returnState: BlocState<InstanceType<B>> = useMemo(() => {
    try {
      if (typeof state === 'object') {
        return new Proxy(state as any, {
          get(_, prop) {
            const value = state[prop as keyof typeof state];
            // Track which state properties are accessed
            usedKeys.current.add(prop as string);
            instanceKeys.current.add(prop as string);
            shouldClear.current = true;
            return value;
          },
        });
      }
    } catch (error) {
      Blac.instance.log('useBloc Error', error);
    }
    return state;
  }, [state, usedKeys, instanceKeys]);

  // Create a proxy for the bloc instance to track property access
  const returnClass = useMemo(() => {
    return new Proxy(resolvedBloc, {
      get(_, prop) {
        const value = resolvedBloc[prop as keyof InstanceType<B>];
        // Track which class properties are accessed (excluding methods)
        if (typeof value !== 'function') {
          usedClassPropKeys.current.add(prop as string);
          instanceClassPropKeys.current.add(prop as string);
          shouldClearClassProp.current = true;
        }
        return value;
      },
    });
  }, [resolvedBloc, usedClassPropKeys, instanceClassPropKeys]);

  // Clean up tracked keys after each render
  useLayoutEffect(() => {
    usedKeys.current = new Set(instanceKeys.current);
    usedClassPropKeys.current = new Set(instanceClassPropKeys.current);

    return () => {
      setTimeout(() => {
        if (shouldClearClassProp.current) {
          instanceClassPropKeys.current.clear();
          shouldClearClassProp.current = false;
        }
        if (shouldClear.current) {
          instanceKeys.current.clear();
          shouldClear.current = false;
        }
      });
    };
  }, [renderInstance]);

  // Set up bloc lifecycle management
  useEffect(() => {
    // Register this component as a consumer of the bloc
    resolvedBloc._addConsumer(rid);
    let resolved = resolvedBloc;

    // If there are other consumers, ensure we're using the correct instance
    if (resolvedBloc._consumers.size !== 0) {
      resolved = Blac.getInstance().getBloc(bloc, {
        id: blocId,
        props: props as any,
        instanceRef: rid,
      }) as InstanceType<B>;

      setResolvedBloc(resolved);
    }

    // Call onMount callback if provided
    options?.onMount?.(resolved);

    // Cleanup: remove this component as a consumer
    return () => resolvedBloc._removeConsumer(rid);
  }, []);

  return [returnState, returnClass];
}
