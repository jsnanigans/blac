import {
  BlocBase,
  BlocConstructor,
  BlocHookDependencyArrayFn,
  BlocState,
  InferPropsFromGeneric,
} from '@blac/core';
import {
  useEffect,
  useMemo,
  useSyncExternalStore
} from 'react';
import useExternalBlocStore from './useExternalBlocStore';

/**
 * Type definition for the return type of the useBloc hook
 * @template B - Bloc constructor type
 */
type HookTypes<B extends BlocConstructor<BlocBase<any>>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

/**
 * Configuration options for the useBloc hook
 */
export interface BlocHookOptions<B extends BlocBase<any>> {
  id?: string;
  selector?: BlocHookDependencyArrayFn<BlocState<B>>;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * Default dependency selector that wraps the entire state in an array
 * @template T - State type
 * @param {T} s - Current state
 * @returns {Array<Array<T>>} Dependency array containing the entire state
 */

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
export default function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  bloc: B,
  options?: BlocHookOptions<InstanceType<B>>,
): HookTypes<B> {
  // Determine ID for isolated or shared blocs
  // const base = bloc as unknown as BlocBaseAbstract;
  // const isIsolated = base.isolated;
  // const effectiveBlocId = isIsolated ? rid : blocId;
  const {
    externalStore,
    usedKeys,
    usedClassPropKeys,
    instance,
    rid,
  } = useExternalBlocStore(bloc, options);

  // Subscribe to state changes using React's external store API
  const state = useSyncExternalStore<BlocState<InstanceType<B>>>(
    externalStore.subscribe,
    externalStore.getSnapshot,
    externalStore.getServerSnapshot,
  );

  const returnState = useMemo(() => {
    return typeof state === 'object'
      ? new Proxy(state, {
          get(_, prop) {
            usedKeys.current.add(prop as string);
            const value = state[prop as keyof typeof state];
            return value;
          },
        })
      : state;
  }, [state]);

  const returnClass = useMemo(() => {
    return new Proxy(instance.current, {
      get(_, prop) {
        if (!instance.current) {
          return null;
        }
        const value = instance.current[prop as keyof InstanceType<B>];
        if (typeof value !== 'function') {
          usedClassPropKeys.current.add(prop as string);
        }
        return value;
      },
    });
  }, [instance.current?.uid]);

  // Set up bloc lifecycle management
  useEffect(() => {
    instance.current._addConsumer(rid);

    // Call onMount callback if provided
    options?.onMount?.(instance.current);

    // Cleanup: remove this component as a consumer using the captured instance
    return () => {
      if (!instance.current) {
        return;
      }
      options?.onUnmount?.(instance.current);
      instance.current._removeConsumer(rid);
    };
  }, [instance.current, rid]); // Do not add options.onMount to deps, it will cause a loop

  return [returnState, returnClass];
}
