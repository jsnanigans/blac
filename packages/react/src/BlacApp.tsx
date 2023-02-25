import { Blac } from 'blac';
import React, { createContext, FC, ReactNode, useEffect } from 'react';
import { ContextKey } from './contextKey';

export const BlacContext = createContext<Blac | null>(null);

const BlacApp: FC<{ children: ReactNode; blac: Blac }> = (props) => {
  const { children, blac } = props;

  useEffect(() => {
    if (BlacContext) {
      blac.addPluginKey(ContextKey.REACT_APP_CONTEXT, BlacContext);
    }
  }, [blac]);

  return <BlacContext.Provider value={blac}>{children}</BlacContext.Provider>;
};

export default BlacApp;
