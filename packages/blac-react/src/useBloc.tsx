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

type HookTypes<B extends BlocConstructor<BlocGeneric>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

export interface BlocHookOptions<B extends BlocGeneric<any, any>> {
  id?: string;
  dependencySelector?: BlocHookDependencyArrayFn<B>;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
}

const defaultDependencySelector: BlocHookDependencyArrayFn<any> = (s) => [[s]];

export default function useBloc<
  B extends BlocConstructor<BlocGeneric>,
  O extends BlocHookOptions<InstanceType<B>>,
>(bloc: B, options?: O): HookTypes<B> {
  let { dependencySelector, id: blocId, props } = options ?? {};
  const rid = useId();
  const usedKeys = useRef<Set<string>>(new Set());
  const instanceKeys = useRef<Set<string>>(new Set());
  const shouldClear = useRef(false);

  const usedClassPropKeys = useRef<Set<string>>(new Set());
  const instanceClassPropKeys = useRef<Set<string>>(new Set());
  const shouldClearClassProp = useRef(false);

  const renderInstance = new Set();

  const base = bloc as unknown as BlocBaseAbstract;
  const isIsolated = base.isolated;
  if (isIsolated) {
    blocId = rid;
  }

  const resolvedBloc = useMemo(
    () =>
      Blac.getInstance().getBloc(bloc, {
        id: blocId,
        props: props as any,
        instanceRef: rid,
      }) as InstanceType<B>,
    [blocId, rid],
  );

  if (!resolvedBloc) {
    throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
  }

  const isMainInstance = rid === resolvedBloc._instanceRef;
  if (isMainInstance && options?.props) {
    resolvedBloc.props = options.props;
  }

  // default options
  const dependencyArray: BlocHookDependencyArrayFn<InstanceType<B>> = (
    newState,
    oldState,
  ) => {
    if (dependencySelector) {
      return dependencySelector(newState, oldState);
    }

    if (resolvedBloc.defaultDependencySelector) {
      return resolvedBloc.defaultDependencySelector(newState, oldState);
    }

    if (typeof newState !== 'object') {
      return defaultDependencySelector(newState, oldState);
    }

    const usedState: string[] = [];
    for (const key of usedKeys.current) {
      if (key in newState) {
        usedState.push(newState[key as keyof typeof newState]);
      }
    }

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

  const { subscribe, getSnapshot, getServerSnapshot } = useMemo(
    () => externalBlocStore(resolvedBloc, dependencyArray, rid),
    [resolvedBloc._createdAt],
  );

  const state = useSyncExternalStore<BlocState<InstanceType<B>>>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const returnState: BlocState<InstanceType<B>> = useMemo(() => {
    try {
      if (typeof state === 'object') {
        return new Proxy(state as any, {
          get(_, prop) {
            const value = state[prop as keyof typeof state];
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

  const returnClass = useMemo(() => {
    return new Proxy(resolvedBloc, {
      get(_, prop) {
        const value = resolvedBloc[prop as keyof InstanceType<B>];
        if (typeof value !== 'function') {
          usedClassPropKeys.current.add(prop as string);
          instanceClassPropKeys.current.add(prop as string);
          shouldClearClassProp.current = true;
        }
        return value;
      },
    });
  }, [resolvedBloc, usedClassPropKeys, instanceClassPropKeys]);

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

  useEffect(() => {
    resolvedBloc._addConsumer(rid);

    if (resolvedBloc._consumers.size !== 0) {
      options?.onMount?.(resolvedBloc);
    }

    return () => resolvedBloc._removeConsumer(rid);
  }, []);

  return [returnState, returnClass];
}
