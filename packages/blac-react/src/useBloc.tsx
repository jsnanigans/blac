import {
  BlocBase,
  BlocConstructor,
  BlocHookDependencyArrayFn,
  BlocState,
  InferPropsFromGeneric,
} from '@blac/core';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import useExternalBlocStore from './useExternalBlocStore';
import { DependencyTracker } from './DependencyTracker';

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
  const {
    externalStore,
    usedKeys,
    usedClassPropKeys,
    instance,
    rid,
    hasProxyTracking,
  } = useExternalBlocStore(bloc, options);

  const state = useSyncExternalStore<BlocState<InstanceType<B>>>(
    externalStore.subscribe,
    () => {
      const snapshot = externalStore.getSnapshot();
      if (snapshot === undefined) {
        throw new Error(
          `[useBloc] State snapshot is undefined for bloc ${bloc.name}. Bloc may not be properly initialized.`,
        );
      }
      return snapshot;
    },
    externalStore.getServerSnapshot
      ? () => {
          const serverSnapshot = externalStore.getServerSnapshot!();
          if (serverSnapshot === undefined) {
            throw new Error(
              `[useBloc] Server state snapshot is undefined for bloc ${bloc.name}. Bloc may not be properly initialized.`,
            );
          }
          return serverSnapshot;
        }
      : undefined,
  );

  const dependencyTracker = useRef<DependencyTracker | null>(null);
  if (!dependencyTracker.current) {
    dependencyTracker.current = new DependencyTracker({
      enableBatching: true,
      enableMetrics: process.env.NODE_ENV === 'development',
      enableDeepTracking: false,
    });
  }

  const stateProxyCache = useRef<WeakMap<object, object>>(new WeakMap());
  const classProxyCache = useRef<WeakMap<object, object>>(new WeakMap());

  const returnState = useMemo(() => {
    hasProxyTracking.current = true;

    if (typeof state !== 'object' || state === null) {
      return state;
    }

    let proxy = stateProxyCache.current.get(state);
    if (!proxy) {
      proxy = new Proxy(state, {
        get(target, prop) {
          if (typeof prop === 'string') {
            usedKeys.current.add(prop);
            dependencyTracker.current?.trackStateAccess(prop);
          }
          const value = target[prop as keyof typeof target];
          return value;
        },
        has(target, prop) {
          return prop in target;
        },
        ownKeys(target) {
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, prop) {
          return Reflect.getOwnPropertyDescriptor(target, prop);
        },
      });
      stateProxyCache.current.set(state as object, proxy as object);
    }
    return proxy;
  }, [state]);

  const returnClass = useMemo(() => {
    if (!instance.current) {
      throw new Error(
        `[useBloc] Bloc instance is null for ${bloc.name}. This should never happen - bloc instance must be defined.`,
      );
    }

    let proxy = classProxyCache.current.get(instance.current);
    if (!proxy) {
      proxy = new Proxy(instance.current, {
        get(target, prop) {
          if (!target) {
            throw new Error(
              `[useBloc] Bloc target is null for ${bloc.name}. This should never happen - bloc target must be defined.`,
            );
          }
          const value = target[prop as keyof InstanceType<B>];
          if (typeof value !== 'function' && typeof prop === 'string') {
            usedClassPropKeys.current.add(prop);
            dependencyTracker.current?.trackClassAccess(prop);
          }
          return value;
        },
      });
      classProxyCache.current.set(instance.current, proxy);
    }
    return proxy;
  }, [instance.current?.uid]);

  const componentRef = useRef({});

  useEffect(() => {
    const currentInstance = instance.current;
    if (!currentInstance) return;

    currentInstance._addConsumer(rid, componentRef.current);

    options?.onMount?.(currentInstance);

    return () => {
      if (!currentInstance) {
        return;
      }
      options?.onUnmount?.(currentInstance);
      currentInstance._removeConsumer(rid);

      dependencyTracker.current?.reset();
    };
  }, [instance.current?.uid, rid]);
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && dependencyTracker.current) {
      const metrics = dependencyTracker.current.getMetrics();
      if (metrics.stateAccessCount > 0 || metrics.classAccessCount > 0) {
        console.debug(`[useBloc] ${bloc.name} Performance Metrics:`, metrics);
      }
    }
  });

  if (returnState === undefined) {
    throw new Error(
      `[useBloc] State is undefined for ${bloc.name}. This should never happen - state must be defined.`,
    );
  }
  if (!returnClass) {
    throw new Error(
      `[useBloc] Instance is null for ${bloc.name}. This should never happen - instance must be defined.`,
    );
  }

  return [returnState, returnClass] as [
    BlocState<InstanceType<B>>,
    InstanceType<B>,
  ];
}
