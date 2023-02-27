import { Blac } from 'blac';
import React, { createContext, FC, useMemo } from 'react';
import BlacReact from './BlacReact';

export const BlacContext = createContext<Blac | null>(null);

const BlacApp: FC<{ children: JSX.Element; blac: Blac }> = (props) => {
  const { children, blac } = props;
  const blacApp = useMemo(() => new BlacReact(blac, BlacContext as any), [blac]);

  if (!blacApp) {
    throw new Error('BlacReact failed to initialize');
  }

  return <BlacContext.Provider value={blac}>{children}</BlacContext.Provider>;
};

export default BlacApp;
