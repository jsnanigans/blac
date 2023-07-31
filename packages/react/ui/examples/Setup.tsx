import type { FC } from "react";
import React from "react";
import Code from "../components/Code";

const Setup: FC = () => {
    return <>
        <p className="read">Create a new global instance of BLAC</p>
        <p>src/blacState.ts</p>
        <Code code={`
import { Blac, Cubit } from "blac";
export const blacState = new Blac();
            `} />

        <p className={"read"}>Add the global provider</p>
        <Code code={`
import { BlacApp } from 'blac-react';
import { blacState } from './blacState';

const App: FC = () => {
  return (
    <BlacApp blac={blacState}>
      <Main />
    </BlacApp>
  );
};

export default App;
              `} />
    </>;
};

export default Setup;
