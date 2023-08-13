import React, { FC } from "react";
import Main from "./Main";

import Tools from "../../devtools/src/tools/App";

const App: FC = () => {
  return (
    <>
      <Main />
      <div className="dt">
        <Tools />
      </div>
    </>
  );
};

export default App;
