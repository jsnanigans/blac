import type { FC } from "react";
import React from "react";

const Setup: FC = () => {
  return <>
    <h1>Setup</h1>
    <p>Create a new global instance of BLAC</p>
    <p>src/blacState.ts</p>
    <pre>
        <code>
            {`
import { Blac, Cubit } from "blac";
export const blacState = new Blac();
            `}</code>
    </pre>

      <p>Add the global provider</p>
      <pre>
          <code>
              {`
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

              `}
          </code>
      </pre>
  </>;
};

export default Setup;
