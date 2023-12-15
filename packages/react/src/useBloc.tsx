import {
  Blac,
  BlocBase,
  BlocConstructor,
  BlocInstanceId,
  BlocProps,
  CubitPropsType,
  ValueType,
} from 'blac';
import { useEffect, useId, useMemo, useSyncExternalStore } from 'react';
import externalBlocStore from './externalBlocStore';

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B,
];

// type BlocHookData<B extends BlocBase<S>, S> = [S, InstanceType<B>]; // B is the bloc class, S is the state of the bloc
// type UseBlocClassResult<B, S> = BlocHookData<B, S>;


export type BlocHookDependencyArrayFn<B extends BlocBase<S>, S> = (
  state: ValueType<B>,
) => unknown[];

export interface BlocHookOptions<B extends BlocBase<S>, S> {
  id?: string;
  dependencySelector?: BlocHookDependencyArrayFn<B, S>;
  props?: CubitPropsType<B>;
}

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
    depsSelector: BlocHookDependencyArrayFn<InstanceType<B>, S>,
  ): BlocHookData<InstanceType<B>, S>;
  static useBloc<B extends BlocConstructor<BlocBase<S>>, S>(
    bloc: B,
    instanceId: string,
  ): BlocHookData<InstanceType<B>, S>;
  static useBloc<B extends BlocConstructor<BlocBase<S>>, S>(
    bloc: B,
    options?:
      | BlocHookOptions<InstanceType<B>, S>
      | BlocHookDependencyArrayFn<InstanceType<B>, S>
      | BlocInstanceId,
  ): BlocHookData<InstanceType<B>, S> {
    const rid = useId();
    // default options
    let dependencyArray: BlocHookDependencyArrayFn<InstanceType<B>, S> = (
      state: ValueType<InstanceType<B>>,
    ) => [state];
    let blocId: BlocInstanceId | undefined;
    let props: BlocProps = {};

    // parse options

    // if options is a function, its a dependencySelector
    if (typeof options === 'function') {
      dependencyArray = options;
    }

    // if options is a string its an ID
    if (typeof options === 'string') {
      blocId = options;
    }

    if (typeof options === 'object') {
      dependencyArray = options.dependencySelector ?? dependencyArray;
      blocId = options.id;
      props = options.props ?? props;
    }

    const base = bloc as unknown as BlocBase<S>;
    const isIsolated = base.isolated;
    if (isIsolated) {
      blocId = rid;
    }

    // const now = Date.now();
    // const createdAt = useRef(now);
    // const dateChanged = now !== createdAt;

    // resolve the bloc, get the existing instance of the bloc or create a new one
    // const resolvedBloc = useMemo(
    //   () =>

    const resolvedBloc = Blac.getInstance().getBloc(bloc, {
      id: blocId,
      props,
      reconnect: false,
    }) as InstanceType<B>;
    //   [renderId.current],
    // );

    if (!resolvedBloc) {
      throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
    }

    const { subscribe, getSnapshot, getServerSnapshot } = useMemo(
      () => externalBlocStore(resolvedBloc, dependencyArray),
      [resolvedBloc.createdAt],
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
