import { Blac, BlocBase, BlocConstructor, BlocInstanceId } from "blac/src";
import { useMemo } from "react";

const useResolvedBloc = <B extends BlocBase<S>, S>(
  bloc: BlocConstructor<B>,
  options: { id?: BlocInstanceId; } = {}
): B => useMemo(() => new Blac().getBloc(bloc, {
  id: options.id
}), [options.id]);

export default useResolvedBloc;
