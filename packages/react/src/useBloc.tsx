import {
  Blac,
  Bloc,
  BlocBase,
  BlocConstructor,
  BlocInstanceId,
  BlocProps,
  Cubit,
  CubitPropsType,
  ValueType,
} from 'blac/src';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import externalBlocStore, { ExternalStore } from './externalBlocStore';

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B,
];

// type BlocHookData<B extends BlocBase<S>, S> = [S, InstanceType<B>]; // B is the bloc class, S is the state of the bloc
// type UseBlocClassResult<B, S> = BlocHookData<B, S>;

export interface BlocHookOptions<B extends BlocBase<S>, S> {
  id?: string;
  dependencySelector?: (state: ValueType<B>) => unknown;
  props?: CubitPropsType<B>;
}

export type BlocHookDependencySelector<B extends BlocBase<S>, S> = (
  state: ValueType<B>,
) => unknown;

export class UseBlocClass {
  // constructor, no options
  static useBloc<B extends BlocConstructor<BlocBase<S>>, S>(
    bloc: B,
  ): BlocHookData<InstanceType<B>, S>;
  static useBloc<B extends BlocConstructor<BlocBase<S>>, S>(
    bloc: B,
    options: BlocHookOptions<InstanceType<B>, S>,
  ): BlocHookData<InstanceType<B>, S>;
  static useBloc<B extends BlocConstructor<BlocBase<S>>, S>(
    bloc: B,
    depsSelector: BlocHookDependencySelector<InstanceType<B>, S>,
  ): BlocHookData<InstanceType<B>, S>;
  static useBloc<B extends BlocConstructor<BlocBase<S>>, S>(
    bloc: B,
    instanceId: string,
  ): BlocHookData<InstanceType<B>, S>;
  static useBloc<B extends BlocConstructor<BlocBase<S>>, S>(
    bloc: B,
    options?:
      | BlocHookOptions<InstanceType<B>, S>
      | BlocHookDependencySelector<InstanceType<B>, S>
      | BlocInstanceId,
  ): BlocHookData<InstanceType<B>, S> {
    // default options
    let dependencySelector: BlocHookDependencySelector<InstanceType<B>, S> = (
      state: ValueType<InstanceType<B>>,
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
    const resolvedBloc = useMemo<InstanceType<B>>(
      () =>
        Blac.getInstance().getBloc(bloc, {
          id: blocId,
          props,
        }) as InstanceType<B>,
      [blocId],
    );

    if (!resolvedBloc) {
      throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
    }

    const { subscribe, getSnapshot, getServerSnapshot } = useMemo(
      () => externalBlocStore(resolvedBloc, dependencySelector),
      [resolvedBloc.id],
    );

    const state = useSyncExternalStore<ValueType<InstanceType<B>>>(
      subscribe,
      getSnapshot,
      getServerSnapshot,
    );

    useEffect(() => {
      resolvedBloc.props = props;
    }, [props]);

    return [state, resolvedBloc];
  }
}

const useBloc = UseBlocClass.useBloc;

export default useBloc;
