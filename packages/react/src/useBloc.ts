import { BlocBase, BlocClass, ValueType } from 'blac';
import { useContext, useMemo, useSyncExternalStore } from 'react';
import { BlacContext } from './BlacApp';
import BlacReact from './BlacReact';
import externalBlocStore, { ExternalStore } from './externalBlocStore';

export type BlocHookData<B extends BlocBase<S>, S> = [
  value: ValueType<B>,
  instance: B
];

export interface BlocHookOptions {
  /**
   * Set to true if you want blac to automatically create a new instance of the bloc,
   * for this to work, pass the unconstructed class to the hook. The constructor should not expect any arguments.
   */
  create?: boolean;
}

export const useBloc = <B extends BlocBase<S>, S>(
  bloc: BlocClass<B> | (() => B),
  options: BlocHookOptions = {}
): BlocHookData<B, S> => {
  const blacReact = BlacReact.getInstance();

  const localProviderKey = blacReact.useLocalProviderKey();

  const blacInstance = useContext(BlacContext);
  const resolvedBloc = useMemo<B | undefined>((): B | undefined => {
    // check if its a create function or a class
    const isFunction = bloc instanceof Function;
    const isBloc = isFunction && (bloc as any)?.isBlacClass;

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

      // if it is not, check if we can create a new instance
      if (!options.create) {
        // creating it automatically should be opt-in
        throw new Error(
          'useBloc: set create to true to create a new bloc when a class constructor is passed'
        );
      }

      // create a new instance -- this can cause issues if the constructor expects arguments
      const constructed = new blocClass();
      return constructed;
    }
  }, []);

  if (!resolvedBloc) {
    throw new Error('useBloc: bloc is undefined');
  }

  const { subscribe, getSnapshot } = useMemo<ExternalStore<B>>(
    () => externalBlocStore(resolvedBloc),
    [resolvedBloc]
  );

  const state = useSyncExternalStore<ValueType<B>>(subscribe, getSnapshot);

  return [state, resolvedBloc];
};