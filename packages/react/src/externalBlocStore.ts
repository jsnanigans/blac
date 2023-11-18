import { BlocBase, ValueType } from 'blac';

export interface ExternalStore<B extends BlocBase<S>, S> {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => S;
  getServerSnapshot?: () => S;
}

const externalBlocStore = <B extends BlocBase<S>, S>(
  bloc: B,
  dependencySelector: (state: S) => unknown,
): ExternalStore<B, S> => {
  let lastDependencyCheck = dependencySelector(bloc.state);
  return {
    subscribe: (listener: () => void) => {
      const unSub = bloc.addEventListenerStateChange((data) => {
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
    getSnapshot: (): S => bloc.state,
    getServerSnapshot: (): S => bloc.state,
  };
};

export default externalBlocStore;
