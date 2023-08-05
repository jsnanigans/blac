import { BlocBase, BlocConstructor, ValueType } from "blac";
import { useMemo, useSyncExternalStore } from "react";
import externalBlocStore, { ExternalStore } from "./externalBlocStore";
import { useResolvedBloc } from "./resolveBloc";

// instanciated version of a class constructor
// export type BlocInstance<B extends BlocBase<B>> = B extends BlocConstructor<B> ? B : never;

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B,
];

const useBloc = <B extends BlocBase<S>, S, RT>(
  bloc: BlocConstructor<B>,
  dependencySelector: (state: ValueType<B>) => unknown = (state) => state
): BlocHookData<B, S> => {
  const resolvedBloc = useResolvedBloc(bloc as unknown as B);

  if (!resolvedBloc) {
    throw new Error(`useBloc: could not resolve: ${bloc.name || bloc}`);
  }

  const { subscribe, getSnapshot } = useMemo<ExternalStore<B>>(
    () => externalBlocStore(resolvedBloc, dependencySelector),
    [resolvedBloc]
  );

  const state = useSyncExternalStore<ValueType<B>>(subscribe, getSnapshot);

  return [state, resolvedBloc];
};

export default useBloc;