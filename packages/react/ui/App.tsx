import React, { FC } from "react";
import BlacApp from "../src/BlacApp";
import Main from "./Main";

const App: FC = () => {
  return (
    <BlacApp>
      <Main />
    </BlacApp>
  );
};

export default App;
