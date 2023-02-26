import { BlocBase } from 'blac';

export interface ExternalStore<S> {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => S;
  getServerSnapshot?: () => S;
}
const externalBlocStore = <B extends BlocBase<S>, S>(
  bloc: B
): ExternalStore<S> => {
  return {
    subscribe: (listener: () => void) => {
      const unSub = bloc.onStateChange(listener);
      return () => {
        unSub();
        bloc.dispose();
      };
    },
    getSnapshot: (): S => bloc.state,
  };
};

export default externalBlocStore;
