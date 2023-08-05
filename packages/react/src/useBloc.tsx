import { BlocBase, BlocConstructor, BlocInstanceId, ValueType } from "blac/src";
import { useMemo, useSyncExternalStore } from "react";
import externalBlocStore, { ExternalStore } from "./externalBlocStore";
import useResolvedBloc from "./useResolvedBloc";

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B,
];

export interface BlocHookOptions<B extends BlocBase<S>, S> {
  id?: string;
  dependencySelector?: (state: ValueType<B>) => unknown;
}

export type BlocHookDependencySelector<B extends BlocBase<S>, S> = (state: ValueType<B>) => unknown;

class UseBlocClass {
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>
  ): BlocHookData<B, S>;
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    options: BlocHookOptions<B, S>
  ): BlocHookData<B, S>;
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    depsSelector: BlocHookDependencySelector<B, S>
  ): BlocHookData<B, S>;
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    instanceId: BlocInstanceId
  ): BlocHookData<B, S>;
  static useBloc<B extends BlocBase<S>, S>(
    bloc: BlocConstructor<B>,
    options?: BlocHookOptions<B, S> | BlocHookDependencySelector<B, S> | BlocInstanceId
  ): BlocHookData<B, S> {
    // default options
    let dependencySelector: BlocHookDependencySelector<B, S> = (state: ValueType<B>) => state;
    let blocId: BlocInstanceId | undefined;

    // parse options
    if (typeof options === "function") {
      dependencySelector = options;
    }

    if (typeof options === "string") {
      blocId = options;
    }

    if (typeof options === "object") {
      dependencySelector = options.dependencySelector ?? dependencySelector;
      blocId = options.id;
    }


    const resolvedBloc = useResolvedBloc<B, S>(bloc, { id: blocId });

    if (!resolvedBloc) {
      throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
    }

    const { subscribe, getSnapshot } = useMemo<ExternalStore<B>>(
      () => externalBlocStore(resolvedBloc, dependencySelector),
      [resolvedBloc]
    );

    const state = useSyncExternalStore<ValueType<B>>(subscribe, getSnapshot);

    return [state, resolvedBloc];
  }
}

const useBloc = UseBlocClass.useBloc;

export default useBloc;