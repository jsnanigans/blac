import { Blac, BlocBase, BlocClass } from "blac";
import { useContext, useMemo } from "react";
import { BlacContext } from "./BlacApp";
import BlacReact from "./BlacReact";

// export interface BlocResolveOptions {
//   /**
//    * Set to true if you want blac to automatically create a new instance of the bloc,
//    * for this to work, pass the unconstructed class to the hook. The constructor should not expect any arguments.
//    */
//   create?: boolean | (() => BlocBase<any>);
// }

interface BlocOptions <B>{
  bloc: BlocClass<B> | (() => B) | B,
  blacInstance:null | Blac<any, any>,
  blacReact: BlacReact,
  // create: boolean | (() => B),
}

const resolveBloc = <B extends BlocBase<S>, S>({
  bloc,
  blacInstance,
  blacReact,
  // create
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

  if ((bloc as BlocBase<any>)?.isBlacLive) {
    return bloc as B;
  }

  // if its a class
  if (isFunction && isBloc) {
    const blocClass = bloc as BlocClass<B>;

    // search in global blocs
    const globalBloc = blacReact.blac.getBloc(blocClass);
    if (globalBloc) {
      return globalBloc;
    }

    if (isLiveBloc) {
      return bloc as unknown as B;
    }
    
    // if it is not, check if we can create a new instance
    // if (!create) {
    //   // creating it automatically should be opt-in
    //   throw new Error(
    //    `Bloc ${blocClass.name} is not registered in the blac instance.` +
    //     `\nfix: a) Register the bloc globally.` +
    //     `\nfix: b) Set 'create' to true when using this ${blocClass.name}, and make sure it has the static 'create' method if it has to initialise with parameters.`
    //   );
    // }

    const createIsFunction = typeof create === 'function';
    const hasCreate = blocClass.hasOwnProperty('create');
    const constructed = createIsFunction ? create() : (hasCreate ? blocClass.create() : new blocClass());

    if (!constructed) {
      throw new Error(
          `Bloc ${blocClass.name} is not registered in the blac instance.` +
          `\nfix: a) Register the bloc globally.` +
          `\nfix: b) Create the bloc instance manually and pass it to the hook. \`const [state] = useBloc(() => new MyBloc());\` `);
    }

    return constructed;
  }
}

export const useResolvedBloc = <B extends BlocBase<S>, S>(
  bloc: B | BlocClass<B> | (() => B),
  options: BlocResolveOptions = {}
): B | undefined => {
  const blacReact = BlacReact.getInstance();
  const blacInstance = useContext(BlacContext);
  const resolvedBloc = useMemo<B | undefined>(() => {
    if(!blacReact) {
      return undefined;
    }

    return resolveBloc({
      bloc,
      blacInstance,
      blacReact,
      create: options.create ?? false
    })
  }, []);

  return resolvedBloc;
}

export default resolveBloc;
