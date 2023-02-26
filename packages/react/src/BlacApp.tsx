import { Blac } from 'blac';
import React, { createContext, FC, useEffect } from 'react';
import BlacReact from './BlacReact';

export const BlacContext = createContext<Blac | null>(null);

const BlacApp: FC<{ children: JSX.Element; blac: Blac }> = (props) => {
  const { children, blac } = props;

  useEffect(() => {
    new BlacReact(blac, BlacContext as any);
  }, [blac]);

  return <BlacContext.Provider value={blac}>{children}</BlacContext.Provider>;
};

export default BlacApp;
