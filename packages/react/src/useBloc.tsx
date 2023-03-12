import { BlocBase, BlocClass, ValueType } from 'blac';
import React, { FC, ReactNode, useMemo, useSyncExternalStore } from 'react';
import { BlocProvider } from '.';
import externalBlocStore, { ExternalStore } from './externalBlocStore';
import { BlocResolveOptions, useResolvedBloc } from './resolveBloc';

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B,
  Provider: FC<{ children: ReactNode; }>
];

export const useBloc = <B extends BlocBase<S>, S>(
  bloc: BlocClass<B> | (() => B),
  options: BlocResolveOptions = {}
): BlocHookData<B, S> => {
  const resolvedBloc = useResolvedBloc(bloc, options);

  if (!resolvedBloc) {
    throw new Error('useBloc: bloc is undefined');
  }

  const { subscribe, getSnapshot } = useMemo<ExternalStore<B>>(
    () => externalBlocStore(resolvedBloc),
    [resolvedBloc]
  );

  const state = useSyncExternalStore<ValueType<B>>(subscribe, getSnapshot);

  const Provider = useMemo<FC<{children: ReactNode}>>(() => {
    return ({ children }) => {
      return <BlocProvider bloc={resolvedBloc}>{children}</BlocProvider>;
    };
  }, [resolvedBloc,]);

  return [state, resolvedBloc, Provider];
};
