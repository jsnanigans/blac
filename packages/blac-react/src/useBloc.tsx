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
  useRef,
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
    () => {
      const snapshot = externalStore.getSnapshot();
      if (snapshot === undefined) {
        throw new Error(`[useBloc] State snapshot is undefined for bloc ${bloc.name}. Bloc may not be properly initialized.`);
      }
      return snapshot;
    },
    externalStore.getServerSnapshot ? () => {
      const serverSnapshot = externalStore.getServerSnapshot!();
      if (serverSnapshot === undefined) {
        throw new Error(`[useBloc] Server state snapshot is undefined for bloc ${bloc.name}. Bloc may not be properly initialized.`);
      }
      return serverSnapshot;
    } : undefined,
  );

  // Cache proxies to avoid recreation on every render
  const stateProxyCache = useRef<WeakMap<object, object>>(new WeakMap());
  const classProxyCache = useRef<WeakMap<object, object>>(new WeakMap());

  const returnState = useMemo(() => {
    if (typeof state !== 'object' || state === null) {
      return state;
    }

    // Check cache first
    let proxy = stateProxyCache.current.get(state);
    if (!proxy) {
      proxy = new Proxy(state, {
        get(target, prop) {
          // Use setTimeout to defer dependency tracking until after render
          setTimeout(() => {
            usedKeys.current.add(prop as string);
          }, 0);
          const value = target[prop as keyof typeof target];
          return value;
        },
        // Handle symbols and non-enumerable properties
        has(target, prop) {
          return prop in target;
        },
        ownKeys(target) {
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, prop) {
          return Reflect.getOwnPropertyDescriptor(target, prop);
        }
      });
      stateProxyCache.current.set(state as object, proxy as object);
    }
    return proxy;
  }, [state]);

  const returnClass = useMemo(() => {
    if (!instance.current) {
      throw new Error(`[useBloc] Bloc instance is null for ${bloc.name}. This should never happen - bloc instance must be defined.`);
    }

    // Check cache first
    let proxy = classProxyCache.current.get(instance.current);
    if (!proxy) {
      proxy = new Proxy(instance.current, {
        get(target, prop) {
          if (!target) {
            throw new Error(`[useBloc] Bloc target is null for ${bloc.name}. This should never happen - bloc target must be defined.`);
          }
          const value = target[prop as keyof InstanceType<B>];
          if (typeof value !== 'function') {
            usedClassPropKeys.current.add(prop as string);
          }
          return value;
        },
      });
      classProxyCache.current.set(instance.current, proxy);
    }
    return proxy;
  }, [instance.current?.uid]);

  // Create a stable reference object for this component
  const componentRef = useRef({});

  // Set up bloc lifecycle management
  useEffect(() => {
    const currentInstance = instance.current;
    if (!currentInstance) return;
    
    // Pass component reference for proper memory management
    currentInstance._addConsumer(rid, componentRef.current);

    // Call onMount callback if provided
    options?.onMount?.(currentInstance);

    // Cleanup: remove this component as a consumer using the captured instance
    return () => {
      if (!currentInstance) {
        return;
      }
      options?.onUnmount?.(currentInstance);
      currentInstance._removeConsumer(rid);
    };
  }, [instance.current?.uid, rid]); // Use UID to ensure we re-run when instance changes

  // Ensure state and instance are never undefined/null
  if (returnState === undefined) {
    throw new Error(`[useBloc] State is undefined for ${bloc.name}. This should never happen - state must be defined.`);
  }
  if (!returnClass) {
    throw new Error(`[useBloc] Instance is null for ${bloc.name}. This should never happen - instance must be defined.`);
  }

  // Safe return with proper typing
  return [returnState, returnClass] as [BlocState<InstanceType<B>>, InstanceType<B>];
}
