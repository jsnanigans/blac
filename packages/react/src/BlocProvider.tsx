import { BlocClass } from 'blac';
import React, { FC, ReactNode } from 'react';
import BlacReact from './BlacReact';

interface BlocProviderProps <B>{
  children?: ReactNode;
  bloc: BlocClass<B> | (() => B) | B;
  debug?: boolean;
}

export const BlocProvider: FC<BlocProviderProps<any>> = ({ children, bloc, debug }) => {
  const blacReact = BlacReact.getInstance();
  const providerId = blacReact.useLocalProvider({ bloc, debug });

  if (!providerId) {
    return null;
  }

  return (
    <blacReact.LocalProvider value={providerId}>
      {children}
    </blacReact.LocalProvider>
  );
};
