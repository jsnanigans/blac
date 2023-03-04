import { BlocBase } from 'blac';
import React, { FC, ReactNode } from 'react';
import BlacReact from './BlacReact';

const BlocProvider: FC<{
  children?: ReactNode;
  bloc: (() => BlocBase<any>) | BlocBase<any>;
  debug?: boolean;
}> = ({ children, bloc, debug }) => {
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

export default BlocProvider;
