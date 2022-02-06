import Typography from "@material-ui/core/Typography";
import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { BlocBuilder, BlocProvider, useBloc, withBlocProvider } from "../state";
import Buttons from "./Buttonts";
import CounterCubit, { CounterCubitTimer, CounterCubitTimerLocal, } from "../bloc/CounterCubit";
import { Box, Button, Card, CardContent } from "@material-ui/core";
import TestLocalCubit from "../bloc/TestLocalCubit";
import Divider from "@material-ui/core/Divider";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import Auth from "./Auth";
import DevTools from "../../devTools/DevTools";
import LazyToggle from "./LazyToggle";
var useStyles = makeStyles(function (theme) { return ({
    // necessary for content to be below app bar
    toolbar: theme.mixins.toolbar,
}); });
var TestLocalBloc = function () {
    var _a = useBloc(TestLocalCubit), s = _a[0], q = _a[1];
    return React.createElement(Button, { onClick: function () { return q.emit("".concat(Math.random())); } }, s);
};
var TestLocalHookCreate = function () {
    var count = useBloc(CounterCubitTimerLocal, {
        create: function () { return new CounterCubitTimerLocal(300); },
    })[0];
    return React.createElement("div", null,
        "Local: ",
        count);
};
var NotConnected = function (_a) {
    var text = _a.text;
    var count = useBloc(CounterCubitTimerLocal)[0];
    return (React.createElement("div", null,
        text,
        ": ",
        count));
};
var Connected = withBlocProvider(new CounterCubitTimerLocal(2000))(NotConnected);
var Killer = function () {
    var _a = useState(false), l = _a[0], sl = _a[1];
    var _b = useBloc(TestLocalCubit), s = _b[0], q = _b[1];
    return (React.createElement("div", null,
        React.createElement(Buttons, null),
        l && (React.createElement("div", null,
            s,
            React.createElement("hr", null),
            React.createElement(BlocProvider, { bloc: function () { return new CounterCubit(); } },
                React.createElement(Typography, { variant: "h4" }, "Local Provider #1"),
                React.createElement(BlocBuilder, { blocClass: CounterCubit, builder: function (_a) {
                        var value = _a[0], increment = _a[1].increment;
                        return (React.createElement("div", null,
                            React.createElement(Button, { onClick: function () { return increment(); } }, value),
                            React.createElement(Buttons, null)));
                    } })))),
        ";",
        React.createElement(Divider, null),
        React.createElement(Button, { onClick: function () { return q.emit("".concat(Math.random())); } }, "RND"),
        React.createElement(Button, { onClick: function () { return sl(!l); } }, "Toggle")));
};
export default function Sandbox() {
    var _a = useState(false), show = _a[0], setShow = _a[1];
    var classes = useStyles();
    return (React.createElement(React.Fragment, null,
        React.createElement(DevTools, null),
        React.createElement(Box, { height: 100 }),
        React.createElement("div", { className: classes.toolbar }),
        React.createElement(Typography, { variant: "h3" }, "Bloc"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(Auth, null),
                React.createElement(Typography, { variant: "h4" }, "Async handler"),
                React.createElement(LazyToggle, null))),
        React.createElement(Box, { m: 2 }),
        React.createElement(Typography, { variant: "h3" }, "BlocBuilder"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(BlocBuilder, { blocClass: CounterCubit, builder: function (_a) {
                        var value = _a[0], increment = _a[1].increment;
                        return (React.createElement("div", null,
                            React.createElement(Button, { onClick: function () { return increment(); } }, value)));
                    } }),
                React.createElement(Buttons, null),
                React.createElement(Box, { m: 2 }),
                React.createElement(BlocBuilder, { blocClass: AuthBloc, builder: function (_a) {
                        var value = _a[0], add = _a[1].add;
                        return (React.createElement("div", null,
                            React.createElement(Button, { onClick: function () { return add(AuthEvent.authenticated); } },
                                "Auth Bloc State: ",
                                React.createElement("b", null, value.toString()))));
                    } }))),
        React.createElement(Box, { m: 2 }),
        React.createElement(Typography, { variant: "h3" }, "Breaking"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(BlocProvider, { bloc: function () { return new TestLocalCubit(); } },
                    React.createElement(Killer, null)))),
        React.createElement(Box, { m: 2 }),
        React.createElement(Typography, { variant: "h3" }, "Local Bloc Hook"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(TestLocalHookCreate, null))),
        React.createElement(Box, { m: 2 }),
        React.createElement(Typography, { variant: "h3" }, "Local Bloc HOC"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(Connected, { text: "HOC with props" }))),
        React.createElement(Typography, { variant: "h3" }, "Local Providers"),
        React.createElement(Card, null,
            React.createElement(CardContent, null,
                React.createElement(BlocProvider, { bloc: function () { return new CounterCubitTimer(); } },
                    React.createElement(Typography, { variant: "h4" }, "Local Counter Timer"),
                    React.createElement(BlocBuilder, { blocClass: CounterCubitTimer, builder: function (_a) {
                            var value = _a[0];
                            return (React.createElement("div", null,
                                React.createElement(Button, null, value)));
                        } })),
                React.createElement(BlocProvider, { bloc: function () { return new CounterCubitTimer(500); } },
                    React.createElement(Typography, { variant: "h4" }, "Local Counter Timer 2"),
                    React.createElement(BlocBuilder, { blocClass: CounterCubitTimer, builder: function (_a) {
                            var value = _a[0];
                            return (React.createElement("div", null,
                                React.createElement(Button, null, value)));
                        } })),
                React.createElement(BlocProvider, { bloc: function () { return new CounterCubit(); } },
                    React.createElement(Typography, { variant: "h4" }, "Local Provider #1"),
                    React.createElement(BlocBuilder, { blocClass: CounterCubit, builder: function (_a) {
                            var value = _a[0], increment = _a[1].increment;
                            return (React.createElement("div", null,
                                React.createElement(Button, { onClick: function () { return increment(); } }, value),
                                React.createElement(Buttons, null)));
                        } })),
                React.createElement(BlocProvider, { bloc: function () { return new CounterCubit(); } },
                    React.createElement(Typography, { variant: "h4" }, "Local Provider #2"),
                    React.createElement(BlocBuilder, { blocClass: CounterCubit, builder: function (_a) {
                            var value = _a[0], increment = _a[1].increment;
                            return (React.createElement("div", null,
                                React.createElement(Button, { onClick: function () { return increment(); } }, value),
                                React.createElement(Buttons, null)));
                        } })),
                React.createElement(BlocProvider, { bloc: new CounterCubit() },
                    React.createElement(BlocProvider, { bloc: new TestLocalCubit() }, show && React.createElement(TestLocalBloc, null)),
                    React.createElement(Button, { onClick: function () { return setShow(!show); } }, "Toggle Show"))))));
}
