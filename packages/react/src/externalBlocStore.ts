import { BlocBase, ValueType } from "blac/src";

export interface ExternalStore<B extends BlocBase<any>> {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => ValueType<B>;
  getServerSnapshot?: () => ValueType<B>;
}

const externalBlocStore = <B extends BlocBase<any>>(
  bloc: B,
  dependencySelector: (state: ValueType<B>) => unknown
): ExternalStore<B> => {
  let lastDependencyCheck = dependencySelector(bloc.state);
  return {
    subscribe: (listener: () => void) => {
      const unSub = bloc.addEventListenerStateChange(data => {
        const newDependencyCheck = dependencySelector(data);
        if (newDependencyCheck !== lastDependencyCheck) {
          lastDependencyCheck = newDependencyCheck;
          listener();
        }
      });
      return () => {
        unSub();
      };
    },
    getSnapshot: (): ValueType<B> => bloc.state
  };
};

export default externalBlocStore;
