import { BlocBase, ValueType } from 'blac';

export interface ExternalStore<B extends BlocBase<any>> {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => ValueType<B>;
  getServerSnapshot?: () => ValueType<B>;
}
const externalBlocStore = <B extends BlocBase<any>>(
  bloc: B
): ExternalStore<B> => {
  return {
    subscribe: (listener: () => void) => {
      const unSub = bloc.onStateChange(listener);
      return () => {
        unSub();
        bloc.dispose();
      };
    },
    getSnapshot: (): ValueType<B> => bloc.state,
  };
};

export default externalBlocStore;
