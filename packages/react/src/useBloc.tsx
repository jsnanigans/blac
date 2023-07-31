import { BlocBase, BlocClass, ValueType } from 'blac';
import React, { FC, ReactNode, useMemo, useSyncExternalStore } from 'react';
import externalBlocStore, { ExternalStore } from './externalBlocStore';
import { BlocResolveOptions, useResolvedBloc } from './resolveBloc';

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B,
];

export const useBloc = <B extends BlocBase<S>, S>(
  bloc: B | BlocClass<B> | (() => B),
  options: BlocResolveOptions = {}
): BlocHookData<B, S> => {
  const resolvedBloc = useResolvedBloc(bloc, options);

  if (!resolvedBloc) {
    throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
  }

  const { subscribe, getSnapshot } = useMemo<ExternalStore<B>>(
    () => externalBlocStore(resolvedBloc),
    [resolvedBloc]
  );

  const state = useSyncExternalStore<ValueType<B>>(subscribe, getSnapshot);

  return [state, resolvedBloc];
};
