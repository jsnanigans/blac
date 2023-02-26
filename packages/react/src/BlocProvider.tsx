import { BlocBase } from 'blac';
import React, {
  createContext,
  FC,
  ReactNode,
  useEffect,
  useMemo
} from 'react';
import BlacReact from './BlacReact';

const BlocProviderContext = createContext<BlocBase<any> | null>(null);

const BlocProvider: FC<{
  children?: ReactNode;
  bloc: (() => BlocBase<any>) | BlocBase<any>;
}> = ({ children, bloc }) => {
  const blacReact = BlacReact.getInstance();
  const providerId = useMemo(() => blacReact.createProviderId(), []);
  const localProviderKey = blacReact.useLocalProviderKey();
  const [blocInstance, setBlocInstance] = React.useState<
    BlocBase<any> | undefined
  >(undefined);

  useEffect(() => {
    if (!blacReact) {
      throw new Error('BlacReact not found in globalThis');
    }

    let instance: undefined | BlocBase<any> = undefined;

    const isFunction = bloc instanceof Function;
    const isLiveBloc =
      !isFunction &&
      typeof bloc === 'object' &&
      (bloc as BlocBase<any>)?.isBlacLive;

    if (isFunction) {
      instance = (bloc as () => BlocBase<any>)();
    }

    if (isLiveBloc) {
      instance = bloc as unknown as BlocBase<any>;
    }

    if (instance) {
      blacReact.addLocalBloc({
        bloc: instance,
        id: providerId,
        parent: localProviderKey,
      });
      setBlocInstance(instance);
    }

    return () => {
      if (instance) {
        blacReact.removeLocalBloc(providerId);
      }
    };
  }, [bloc]);

  // do not add providers if bloc is not set up
  if (!blocInstance) {
    return null;
  }

  return (
    <blacReact.LocalProvider value={providerId}>
      <BlocProviderContext.Provider value={blocInstance}>
        {children}
      </BlocProviderContext.Provider>
    </blacReact.LocalProvider>
  );
};

export default BlocProvider;
