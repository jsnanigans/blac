import type { FC } from "react";
import React from "react";
import Code from "../components/Code";

const Setup: FC = () => {
  return <>
    <p className={"read"}>Add the provider to your app</p>
    <Code code={`
import { BlacApp } from 'blac-react';

const App: FC = () => {
  return (
    <BlacApp>
      <Main />
    </BlacApp>
  );
};

export default App;
              `} />
  </>;
};

export default Setup;
