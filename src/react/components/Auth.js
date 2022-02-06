import React from "react";
import { useBloc } from "../state";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import { Button, ButtonGroup, Typography, } from "@material-ui/core";
export default function Auth() {
    var _a = useBloc(AuthBloc), data = _a[0], auth = _a[1];
    return (React.createElement(React.Fragment, null,
        React.createElement(Typography, null,
            "State: ",
            JSON.stringify(data)),
        React.createElement(ButtonGroup, null,
            React.createElement(Button, { onClick: function () { return auth.add(AuthEvent.authenticated); } }, "Login"),
            React.createElement(Button, { onClick: function () { return auth.add(AuthEvent.unknown); } }, "Unknown"),
            React.createElement(Button, { onClick: function () { return auth.add(AuthEvent.unauthenticated); } }, "logout"))));
}
