import { Blac, BlocBase, BlocBaseAbstract, BlocConstructor } from "blac";
import { useContext, useMemo } from "react";
import { BlacContext } from "./BlacApp";
import BlacReact from "./BlacReact";

interface BlocOptions<B> {
  bloc: BlocConstructor<B> | (() => B) | B,
  blacInstance: null | Blac,
  blacReact: BlacReact,
  // create: boolean | (() => B),
}

const resolveBloc = <B extends BlocBase<S>, S>(
  {
    bloc,
    blacReact
    // create
  }: BlocOptions<B>
): B | undefined => {
  // check if its a create function or a class
  const isFunction = bloc instanceof Function;
  const isBloc = isFunction && (bloc as unknown as BlocBaseAbstract)?.isBlacClass;
  const isLiveBloc = !isFunction &&
    typeof bloc === "object" &&
    (bloc as BlocBase<any>)?.isBlacLive;

  // if it is a create function, call it
  if (!isBloc && isFunction) {
    return (bloc as () => B)();
  }

  if ((bloc as BlocBase<any>)?.isBlacLive) {
    return bloc as B;
  }

  // if it is a class
  const blocClass = bloc as BlocConstructor<B>;

  if (isLiveBloc) {
    return bloc as unknown as B;
  }

  const registered = blacReact.blac.getBloc(blocClass);
  if (registered) {
    return registered;
  }
};

export const useResolvedBloc = <B extends BlocBase<S>, S>(
  bloc: B
): B | undefined => {
  const blacReact = BlacReact.getInstance();
  const blacInstance = useContext(BlacContext);
  return useMemo<B | undefined>(() => {
    if (!blacReact) {
      return undefined;
    }

    return resolveBloc({
      bloc,
      blacInstance,
      blacReact
    });
  }, []);
};

export default resolveBloc;
