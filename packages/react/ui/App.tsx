import React, { FC } from "react";
import BlacApp from "../src/BlacApp";
import { blacState } from "./examples/blacState";
import Main from "./Main";

const App: FC = () => {
    return (
        <BlacApp blac={blacState}>
            <Main />
        </BlacApp>
    );
};

export default App;
