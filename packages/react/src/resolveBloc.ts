import { Blac, BlocBase, BlocClass } from "blac";
import { useContext, useMemo } from "react";
import { BlacContext } from "./BlacApp";
import BlacReact from "./BlacReact";

export interface BlocResolveOptions {
  /**
   * Set to true if you want blac to automatically create a new instance of the bloc,
   * for this to work, pass the unconstructed class to the hook. The constructor should not expect any arguments.
   */
  create?: boolean;
}

interface BlocOptions <B>{
  bloc: BlocClass<B> | (() => B) | B,
  blacInstance:null | Blac<any, any>,
  blacReact: BlacReact,
  create: boolean
  localProviderKey: string,
}

const resolveBloc = <B extends BlocBase<S>, S>({
  bloc,
  blacInstance,
  localProviderKey,
  blacReact,
  create
}: BlocOptions<B>): B | undefined => {
  // check if its a create function or a class
  const isFunction = bloc instanceof Function;
  const isBloc = isFunction && (bloc as any)?.isBlacClass;
  const isLiveBloc = !isFunction &&
    typeof bloc === 'object' &&
    (bloc as BlocBase<any>)?.isBlacLive;

  // if its a create function, call it
  if (!isBloc && isFunction) {
    return (bloc as () => B)();
  }

  // if its a class
  if (isFunction && isBloc) {
    const blocClass = bloc as BlocClass<B>;

    // check if the bloc is registered in the blac instance
    if (blacInstance) {
      const e = blacReact.getLocalBlocForProvider(
        localProviderKey,
        blocClass
      );
      if (e) {
        return e as unknown as B;
      }
    }

    // search in global blocs
    const globalBloc = blacReact.blac.getBloc(blocClass);
    if (globalBloc) {
      return globalBloc;
    }

    if (isLiveBloc) {
      return bloc as unknown as B;
    }
    

    console.log(typeof bloc, {
      isFunction,
      isBloc,
      isLiveBloc,
      bloc,
      create,
    })

    // if it is not, check if we can create a new instance
    if (!create) {
      // creating it automatically should be opt-in
      throw new Error(
        'useBloc: set create to true to create a new bloc when a class constructor is passed'
      );
    }

    // create a new instance -- this can cause issues if the constructor expects arguments
    const constructed = new blocClass();
    return constructed;
  }
}

export const useResolvedBloc = <B extends BlocBase<S>, S>(
  bloc: BlocClass<B> | (() => B),
  options: BlocResolveOptions = {}
): B | undefined => {
  const blacReact = BlacReact.getInstance();
  const localProviderKey = blacReact.useLocalProviderKey();
  const blacInstance = useContext(BlacContext);
  const resolvedBloc = useMemo<B | undefined>(() => {
    if(!blacReact || !localProviderKey) {
      return undefined;
    }    


    return resolveBloc({
      bloc,
      blacInstance,
      blacReact,
      localProviderKey,
      create: options.create ?? false
    })
  }, [localProviderKey]);

    console.trace(resolvedBloc, options)
  return resolvedBloc;
}

export default resolveBloc;
