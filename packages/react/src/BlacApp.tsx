import { Blac } from "blac";
import React, { createContext, FC, ReactNode, useMemo } from "react";
import BlacReact from "./BlacReact";

export const BlacContext = createContext<Blac | null>(null);

const BlacApp: FC<{ children: ReactNode; blac?: Blac }> = (props) => {
  const { children, blac } = props;
  const blacInstance = useMemo(() => blac ?? new Blac(), [blac]);
  const blacApp = useMemo(() => new BlacReact(blacInstance, BlacContext as any), [blacInstance]);

  if (!blacApp) {
    throw new Error("BlacReact failed to initialize");
  }

  return <BlacContext.Provider value={blacInstance}>{children}</BlacContext.Provider>;
};

export default BlacApp;
