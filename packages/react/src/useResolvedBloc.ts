import { Blac, BlocBase, BlocConstructor, BlocInstanceId, BlocProps } from "blac/src";
import { useMemo } from "react";

const useResolvedBloc = <B extends BlocBase<S>, S>(
  bloc: BlocConstructor<B>,
  options: { id?: BlocInstanceId; props?: BlocProps } = {}
): B => useMemo(() => new Blac().getBloc(bloc, {
  id: options.id,
  props: options.props
}), [options.id]);

export default useResolvedBloc;
