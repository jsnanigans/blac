/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Blac,
  BlocBaseAbstract,
  BlocConstructor,
  BlocGeneric,
  BlocHookDependencyArrayFn,
  BlocState,
  InferPropsFromGeneric
} from 'blac-next';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
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
export interface BlocHookOptions<B extends BlocGeneric<unknown>> {
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
export default function useBloc<B extends BlocConstructor<BlocGeneric>>(
  bloc: B,
  options?: BlocHookOptions<InstanceType<B>>,
): HookTypes<B> {
  const { dependencySelector, id: blocId, props } = options ?? {};
  const rid = useId();

  // Track used state keys
  const usedKeys = useRef<Set<string>>(new Set());
  const instanceKeys = useRef<Set<string>>(new Set());

  // Track used class properties
  const usedClassPropKeys = useRef<Set<string>>(new Set());
  const instanceClassPropKeys = useRef<Set<string>>(new Set());

  const renderInstance = {};

  // Determine ID for isolated or shared blocs
  const base = bloc as unknown as BlocBaseAbstract;
  const isIsolated = base.isolated;
  const effectiveBlocId = isIsolated ? rid : blocId;

  // Use useRef to hold the bloc instance reference consistently across renders
  const blocRef = useRef<InstanceType<B> | null>(null);

  // Initialize or get the bloc instance ONCE using useMemo based on the effective ID
  // This avoids re-running Blac.getBloc on every render.
  useMemo(() => {
    blocRef.current = Blac.getBloc(bloc, {
      id: effectiveBlocId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      props: props as any,
      instanceRef: rid, // Pass component ID for consumer tracking
    });
  }, [bloc, effectiveBlocId, rid]); // Dependencies ensure this runs only when bloc type or ID changes

  const resolvedBloc = blocRef.current;

  if (!resolvedBloc) {
    // This should ideally not happen if Blac.getBloc works correctly
    throw new Error(`useBloc: could not resolve bloc: ${bloc.name || bloc}`);
  }

  // Update props ONLY if this hook instance created the bloc (or is the designated main instance)
  // We rely on Blac.getBloc to handle initial props correctly during creation.
  // Subsequent calls should not overwrite props.
  // Check if this instanceRef matches the one stored on the bloc when it was created/first retrieved.
  if (
    rid === resolvedBloc._instanceRef &&
    options?.props &&
    Blac.instance.findRegisteredBlocInstance(bloc, effectiveBlocId) ===
      resolvedBloc
  ) {
    // Avoid double-setting props if Blac.getBloc already set them during creation
    if (resolvedBloc.props !== options.props) {
      resolvedBloc.props = options.props;
    }
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return resolvedBloc.defaultDependencySelector(newState, oldState);
    }

    // For primitive states, use default selector
    if (typeof newState !== 'object') {
      return defaultDependencySelector(newState, oldState);
    }

    // For object states, track which properties were actually used
    const usedStateValues: string[] = [];
    for (const key of usedKeys.current) {
      if (key in newState) {
        usedStateValues.push(newState[key as keyof typeof newState]);
      }
    }

    // Track used class properties for dependency tracking, this enables rerenders when class getters change
    const usedClassValues: unknown[] = [];
    for (const key of usedClassPropKeys.current) {
      if (key in resolvedBloc) {
        try {
          const value = resolvedBloc[key as keyof InstanceType<B>];
          switch (typeof value) {
            case 'function':
              continue;
            default:
              usedClassValues.push(value);
              continue;
          }
        } catch (error) {
          Blac.instance.log('useBloc Error', error);
        }
      }
    }

    setTimeout(() => {
      instanceKeys.current = new Set();
      instanceClassPropKeys.current = new Set();
    });
    return [usedStateValues, usedClassValues];
  };

  // Set up external store subscription for state updates
  const store = useMemo(
    () => externalBlocStore(resolvedBloc, dependencyArray, rid),
    [resolvedBloc, rid],
  ); // dependencyArray removed as it changes frequently

  // Subscribe to state changes using React's external store API
  const state = useSyncExternalStore<BlocState<InstanceType<B>>>(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  // Create a proxy for state to track property access
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const returnState: BlocState<InstanceType<B>> = useMemo(() => {
    try {
      if (typeof state === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return new Proxy(state as any, {
          get(_, prop) {
            instanceKeys.current.add(prop as string);
            usedKeys.current.add(prop as string);
            const value = state[prop as keyof typeof state];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return value;
          },
        });
      }
    } catch (error) {
      Blac.instance.log('useBloc Error', error);
    }
    return state;
  }, [state]);

  // Create a proxy for the bloc instance to track property access
  const returnClass = useMemo(() => {
    return new Proxy(resolvedBloc, {
      get(_, prop) {
        const value = resolvedBloc[prop as keyof InstanceType<B>];
        // Track which class properties are accessed (excluding methods)
        if (typeof value !== 'function') {
          instanceClassPropKeys.current.add(prop as string);
        }
        return value;
      },
    });
  }, [resolvedBloc]);

  // Clean up tracked keys after each render
  useLayoutEffect(() => {
    // inherit the keys from the previous render
    usedKeys.current = new Set(instanceKeys.current);
    usedClassPropKeys.current = new Set(instanceClassPropKeys.current);
  }, [renderInstance]);

  // Set up bloc lifecycle management
  useEffect(() => {
    const currentBlocInstance = blocRef.current; // Capture instance for cleanup
    if (!currentBlocInstance) return () => {
      // Blac.instance.cleanupAfterRemoveConsumer(
      //   base as unknown as BlocBase<unknown>,
      //   rid,
      // ); // Removed: Redundant, handled by _removeConsumer event dispatch
    }; // Should not happen

    // Blac.createNewBlocInstance now handles adding the initial consumer,
    // but the useEffect call seems necessary for tests to correctly see
    // the consumer count immediately after mount.
    currentBlocInstance._addConsumer(rid);

    // Call onMount callback if provided
    options?.onMount?.(currentBlocInstance);

    // Cleanup: remove this component as a consumer using the captured instance
    return () => {
      currentBlocInstance._removeConsumer(rid);
      // Blac.instance.cleanupAfterRemoveConsumer(
      //   base as unknown as BlocBase<unknown>,
      //   rid,
      // ); // Removed: Redundant, handled by _removeConsumer event dispatch
    };
  }, [options?.onMount, bloc, rid]); // Removed resolvedBloc, props from deps

  return [returnState, returnClass];
}
