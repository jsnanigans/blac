import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid, IconButton, List, ListItem, ListItemText, ListSubheader, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useBlocTools } from "./state/state";
import BlocsCubit from "./state/BlocsCubit";
import { Alert } from "@material-ui/lab";
import clsx from "clsx";
import Bug from "@material-ui/icons/BugReport";
var useStyles = makeStyles(function (theme) { return ({
    root: {
        position: "fixed",
        background: "#333",
        zIndex: 9999,
        borderTop: "2px solid #000",
        display: "flex",
        flexDirection: "column",
        right: 0,
        bottom: 0,
        left: 0,
        height: '500px',
        transform: 'translateY(100%)',
        transition: 'transform 0.3s ease-in-out',
    },
    showRoot: {
        transform: 'translateY(0)',
    },
    showButton: {
        position: "absolute",
        bottom: '100%',
        right: 0,
    },
    content: {
        flex: "1",
        display: "flex",
        height: "0"
    },
    blocItems: {
        overflow: "auto",
        width: "230px"
    },
    listHeader: {
        background: "#333",
        borderBottom: "1px solid #555"
    }
}); });
var useItemStyles = makeStyles(function (theme) { return ({
    item: {
        width: "100%",
        justifyContent: "flex-start",
        "& span": {
            textTransform: "none"
        }
    },
    itemWrap: {
        position: "relative"
    },
    "@keyframes move": {
        "0%": {
            left: "100%",
            opacity: 1
        },
        "100%": {
            left: "0%",
            opacity: 0
        }
    },
    event: {
        width: "4px",
        pointerEvents: "none",
        background: "#f99",
        position: "absolute",
        left: "100%",
        top: 0,
        bottom: 0,
        opacity: 0,
        animation: "$move 600ms linear"
    }
}); });
var useDetailStyles = makeStyles(function (theme) { return ({
    details: {
        flex: "1",
        overflow: "auto",
        borderLeft: "1px solid #000",
        padding: "20px"
    },
    value: {
        padding: "15px 20px",
        marginBottom: "20px"
    },
    code: {
        margin: "10px 0",
        background: "#111",
        padding: "6px 20px",
        borderRadius: "5px",
        color: "white"
    }
}); });
var BlocItem = function (_a) {
    var bloc = _a.bloc, onSelect = _a.onSelect, selected = _a.selected;
    var classes = useItemStyles();
    var container = useRef(null);
    var _b = useState(undefined), event = _b[0], setEvent = _b[1];
    var addChange = useCallback(function (e) {
        var _a;
        setEvent(e);
        var el = document.createElement("div");
        el.classList.add(classes.event);
        (_a = container.current) === null || _a === void 0 ? void 0 : _a.appendChild(el);
        setTimeout(function () {
            var _a;
            (_a = container.current) === null || _a === void 0 ? void 0 : _a.removeChild(el);
        }, 1000);
    }, [bloc, container]);
    useEffect(function () {
        return bloc.addChangeListener(addChange);
    }, [bloc]);
    return React.createElement("div", { ref: container, className: classes.itemWrap },
        React.createElement(ListItem, { button: true, className: classes.item, onClick: function () { return onSelect(bloc, event); }, selected: selected },
            React.createElement(ListItemText, null, bloc.constructor.name)));
};
var BlocDetails = function (_a) {
    var bloc = _a.bloc, lastEvent = _a.lastEvent;
    var classes = useDetailStyles();
    var selected = bloc;
    var _b = useState(lastEvent), event = _b[0], setEvent = _b[1];
    var addChange = useCallback(function (event) {
        setEvent(event);
    }, [bloc]);
    useEffect(function () {
        return bloc === null || bloc === void 0 ? void 0 : bloc.addChangeListener(addChange);
    }, [bloc]);
    return React.createElement("div", { className: classes.details },
        selected && React.createElement("div", null,
            React.createElement(Typography, { variant: "h5" }, "Value"),
            React.createElement(Paper, { className: classes.value },
                React.createElement("pre", { className: classes.code }, JSON.stringify(selected.state, null, 2))),
            React.createElement(Typography, { variant: "h5" }, "Most recent change"),
            React.createElement(Paper, { className: classes.value },
                !event && React.createElement(Alert, { severity: "info" }, "No events captured"),
                event && React.createElement(Grid, { container: true, spacing: 3 },
                    React.createElement(Grid, { item: true, sm: 6 },
                        React.createElement(Typography, { variant: "body1" }, "From"),
                        React.createElement("pre", { className: classes.code }, JSON.stringify(event === null || event === void 0 ? void 0 : event.currentState, null, 2))),
                    React.createElement(Grid, { item: true, sm: 6 },
                        React.createElement(Typography, { variant: "body1" }, "To"),
                        React.createElement("pre", { className: classes.code }, JSON.stringify(event === null || event === void 0 ? void 0 : event.nextState, null, 2))))),
            React.createElement(Typography, { variant: "h5" }, "Details"),
            React.createElement(Paper, { className: classes.value },
                React.createElement(TableContainer, null,
                    React.createElement(Table, null,
                        React.createElement(TableBody, null,
                            React.createElement(TableRow, null,
                                React.createElement(TableCell, null,
                                    React.createElement("strong", null, "Created At")),
                                React.createElement(TableCell, null, selected.createdAt.toISOString())),
                            React.createElement(TableRow, null,
                                React.createElement(TableCell, null,
                                    React.createElement("strong", null, "ID")),
                                React.createElement(TableCell, null, selected.id)),
                            React.createElement(TableRow, null,
                                React.createElement(TableCell, null,
                                    React.createElement("strong", null, "Register Listeners")),
                                React.createElement(TableCell, null, selected.registerListeners.length)),
                            React.createElement(TableRow, null,
                                React.createElement(TableCell, null,
                                    React.createElement("strong", null, "Change Listeners"),
                                    " (2 are from the debug tools)"),
                                React.createElement(TableCell, null, selected.changeListeners.length)),
                            React.createElement(TableRow, null,
                                React.createElement(TableCell, null,
                                    React.createElement("strong", null, "Value Change Listeners")),
                                React.createElement(TableCell, null, selected.valueChangeListeners.length))))))),
        !selected && React.createElement("div", null,
            React.createElement(Alert, { severity: "info" }, "Select a BLoC to see details")));
};
var Content = function () {
    var _a;
    var _b;
    var classes = useStyles();
    // const [tab, setTab] = useState(0);
    var _c = useState([undefined, undefined]), selected = _c[0], setSelected = _c[1];
    var blocs = useBlocTools(BlocsCubit)[0];
    var _d = useState(false), show = _d[0], setShow = _d[1];
    // const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    //   setTab(newValue);
    // };
    // const [change, setChange] = useState<Record<string, ChangeEvent<any>>>({});
    //
    // const addChange = useCallback((id: string, event: ChangeEvent<any>) => {
    //   setChange({
    //     ...change,
    //     [id]: event
    //   });
    //   console.log({...change});
    // }, [change])
    //
    // useEffect(() => {
    //   const removers: Array<() => void> = [];
    //   blocs.blocs.forEach(b => {
    //     const rm = b.addChangeListener((event) => {
    //       addChange(b.id, event);
    //     });
    //     removers.push(rm);
    //   });
    //
    //   return () => {
    //     removers.forEach(rm => rm());
    //   };
    // }, []);
    var globalBlocs = useMemo(function () { return blocs.blocs.filter(function (b) { return b.meta.scope === "global"; }); }, [blocs]);
    var localBlocs = useMemo(function () { return blocs.blocs.filter(function (b) { return b.meta.scope === "local"; }); }, [blocs]);
    return React.createElement("div", { className: clsx(classes.root, (_a = {},
            _a[classes.showRoot] = show,
            _a)) },
        React.createElement(IconButton, { onClick: function () { return setShow(!show); }, className: classes.showButton },
            React.createElement(Bug, null)),
        React.createElement("div", { className: classes.content },
            React.createElement("div", { className: classes.blocItems },
                React.createElement(List, null,
                    React.createElement(ListSubheader, { className: classes.listHeader },
                        "Global BLoCs (",
                        globalBlocs.length,
                        ")"),
                    globalBlocs.map(function (bloc) {
                        return React.createElement(BlocItem, { key: bloc.id, bloc: bloc, onSelect: function (b, e) { return setSelected([b, e]); }, selected: bloc === selected[0] });
                    }),
                    React.createElement(ListSubheader, { className: classes.listHeader },
                        "Local BLoCs (",
                        localBlocs.length,
                        ")"),
                    localBlocs.map(function (bloc) {
                        return React.createElement(BlocItem, { key: bloc.id, bloc: bloc, onSelect: function (b, e) { return setSelected([b, e]); }, selected: bloc === selected[0] });
                    }))),
            React.createElement(BlocDetails, { key: (_b = selected[0]) === null || _b === void 0 ? void 0 : _b.id, bloc: selected[0], lastEvent: selected[1] })));
};
export default Content;
