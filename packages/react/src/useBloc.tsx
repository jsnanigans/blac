import {
  BlocBase,
  BlocConstructor,
  BlocInstanceId,
  BlocProps,
  CubitPropsType,
  ValueType,
  Blac,
} from 'blac';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import externalBlocStore, { ExternalStore } from './externalBlocStore';
import useResolvedBloc from './useResolvedBloc';

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B
];

export interface BlocHookOptions<B extends BlocBase<S>, S> {
  id?: string;
  dependencySelector?: (state: ValueType<B>) => unknown;
  props?: CubitPropsType<B>;
}

export type BlocHookDependencySelector<B extends BlocBase<S>, S> = (
  state: ValueType<B>
) => unknown;

class UseBlocClass {
  // constructor, no options
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>
  ): BlocHookData<B, S>;
  // constructor with options
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    options: BlocHookOptions<B, S>
  ): BlocHookData<B, S>;
  // constructor with selector
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    depsSelector: BlocHookDependencySelector<B, S>
  ): BlocHookData<B, S>;
  // constructor with Instance ID
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    instanceId: BlocInstanceId
  ): BlocHookData<B, S>;
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    options?:
      | BlocHookOptions<B, S>
      | BlocHookDependencySelector<B, S>
      | BlocInstanceId
  ): BlocHookData<B, S> {
    // default options
    let dependencySelector: BlocHookDependencySelector<B, S> = (
      state: ValueType<B>
    ) => state;
    let blocId: BlocInstanceId | undefined;
    let props: BlocProps = {};

    // parse options

    // if options is a function, its a dependencySelector
    if (typeof options === 'function') {
      dependencySelector = options;
    }

    // if options is a string its an ID
    if (typeof options === 'string') {
      blocId = options;
    }

    if (typeof options === 'object') {
      dependencySelector = options.dependencySelector ?? dependencySelector;
      blocId = options.id;
      props = options.props ?? props;
    }

    // resolve the bloc, get the existing instance of the bloc or create a new one
    const resolvedBloc = useMemo(
      () =>
        Blac.getInstance().getBloc(bloc, {
          id: blocId,
          props,
        }),
      [blocId]
    );

    if (!resolvedBloc) {
      throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
    }

    const { subscribe, getSnapshot, getServerSnapshot } = useMemo<
      ExternalStore<B>
    >(
      () => externalBlocStore(resolvedBloc, dependencySelector),
      [resolvedBloc]
    );

    const state = useSyncExternalStore<ValueType<B>>(
      subscribe,
      getSnapshot,
      getServerSnapshot
    );

    useEffect(() => {
      resolvedBloc.props = props;
    }, [props]);

    return [state, resolvedBloc];
  }
}

const useBloc = UseBlocClass.useBloc;

export default useBloc;
