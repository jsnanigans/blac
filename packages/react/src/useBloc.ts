import { Bloc, BlocBase, InferBlocType } from 'blac';
import { useMemo, useSyncExternalStore } from 'react';
import externalBlocStore, { ExternalStore } from './externalBlocStore';

// export type UseBlocReturn<B extends BlocBase<S>, S> = [B['state'], B];
// export type ValueType<T extends BlocBase<any>> = T extends BlocBase<infer U>
//   ? U
//   : never;
export type BlocClass<T> = new (args: never[]) => T;
export type BlocHookData<T extends BlocBase<S>, S> = [value: S, instance: T];

export type BlocHookOptions<T extends BlocBase<S>, S> = {
  create?: boolean;
}

// B extends BlocBase<S>,
export const useBloc = <B extends BlocBase<S>, S>(
  bloc: BlocClass<B> | (() => B),
  options?: BlocHookOptions<B, S> = {}
): BlocHookData<B, S> => {
  const resolvedBloc = useMemo<B | undefined>(() => {
    

    const isFunction = bloc instanceof Function;
    const isBloc = isFunction && (bloc as undefined | any)?.isBlacClass;

    if (!isBloc && isFunction) {
      return (bloc as () => B)();
    }

    if (isFunction && isBloc) {
      if (!options.create) {
        throw new Error('useBloc: set create to true to create a new bloc when a class constructor is passed');
      }

      const blocClassC = bloc as BlocClass<B>;
      const constructed = new blocClassC(undefined as any);
      return constructed;
    }
  }, []);

  if (!resolvedBloc) {
    throw new Error('useBloc: bloc is undefined');
  }

  const { subscribe, getSnapshot } = useMemo<ExternalStore<S>>(
    () => externalBlocStore(resolvedBloc),
    [resolvedBloc]
  );

  const state = useSyncExternalStore<S>(subscribe, getSnapshot);

  return [state, resolvedBloc];
};
