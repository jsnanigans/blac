import { useBloc } from "../state";
import CounterCubit from "../bloc/CounterCubit";
import React from "react";
import { Button } from "@material-ui/core";
export default function Buttons() {
    var _a = useBloc(CounterCubit, {
        subscribe: false,
    }), _b = _a[1], increment = _b.increment, decrement = _b.decrement;
    return (React.createElement("div", null,
        React.createElement(Button, { color: "secondary", onClick: decrement }, "DECREMENT"),
        React.createElement(Button, { color: "primary", onClick: increment }, "INCREMENT")));
}
