import { Blac } from 'blac';
import React, { createContext, FC, ReactNode, useMemo } from 'react';
import BlacReact from './BlacReact';

export const BlacContext = createContext<Blac<any, any> | null>(null);

const BlacApp: FC<{ children: ReactNode; blac: Blac<any, any> }> = (props) => {
  const { children, blac } = props;
  const blacApp = useMemo(() => new BlacReact(blac, BlacContext as any), [blac]);

  if (!blacApp) {
    throw new Error('BlacReact failed to initialize');
  }

  return <BlacContext.Provider value={blac}>{children}</BlacContext.Provider>;
};

export default BlacApp;
