import { Blac, BlocBase } from 'blac';
import React, { Children, createContext, FC, ReactNode, useMemo } from 'react';
import BlacReact from './BlacReact';

const BlocProviderContext = createContext<BlocBase<any> | null>(null);

const BlocProvider: FC<{
  children?: ReactNode;
  bloc: (() => BlocBase<any>);
}> = ({ children, bloc }) => {
  const blacReact = BlacReact.getInstance();
  const providerId = Math.random().toString(36).split('.')[1];
  const localProviderKey = blacReact.useLocalProviderKey();
  // console.log('BlocProvider Ctx', Ctx)

  const blocInstance = useMemo(() => {
    const blac = globalThis.blac as Blac | undefined;
    if (!blac) {
      throw new Error('Blac not found in globalThis');
    }



    const blocInstance = bloc();
    console.log('BlocProvider blocInstance', blocInstance);

    const blocIsGlobal = blac.isGlobalBloc(blocInstance);

    blacReact.addLocalBloc({
      bloc: blocInstance,
      id: providerId,
      parent: blocIsGlobal ? localProviderKey : undefined,
    });
    return blocInstance;
  }, [bloc]);

  return (
    <blacReact.LocalProvider value={providerId}>
      <BlocProviderContext.Provider value={blocInstance}>
        {Children.only(children)}
      </BlocProviderContext.Provider>
    </blacReact.LocalProvider>
  );
};

export default BlocProvider;
