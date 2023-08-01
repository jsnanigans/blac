import { Blac, BlacOptions } from "blac/src";
import React, { createContext, FC, ReactNode, useMemo } from "react";
import BlacReact from "./BlacReact";

export const BlacContext = createContext<Blac<any> | null>(null);

const BlacApp: FC<{ children: ReactNode; blac?: Blac<any>, options?: BlacOptions<any> }> = (props) => {
  const { children, blac } = props;
  const blacInstance = blac ?? new Blac(props.options);
  const blacApp = useMemo(() => new BlacReact(blacInstance, BlacContext as any), [blacInstance]);

  if (!blacApp) {
    throw new Error("BlacReact failed to initialize");
  }

  return <BlacContext.Provider value={blacInstance}>{children}</BlacContext.Provider>;
};

export default BlacApp;
