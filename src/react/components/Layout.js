import React from "react";
import PropTypes from "prop-types";
import AppBar from "@material-ui/core/AppBar";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import BugReportIcon from "@material-ui/icons/BugReport";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import MenuIcon from "@material-ui/icons/Menu";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { Container, FormControlLabel, Switch } from "@material-ui/core";
import Routes from "./Routes";
import { Link } from "react-router-dom";
import { useBloc } from "../state";
import PreferencesCubit from "../bloc/PreferencesCubit";
var drawerWidth = 240;
var useStyles = makeStyles(function (theme) {
    var _a, _b, _c;
    return ({
        root: {
            display: "flex",
        },
        drawer: (_a = {},
            _a[theme.breakpoints.up("sm")] = {
                width: drawerWidth,
                flexShrink: 0,
            },
            _a),
        appBar: (_b = {},
            _b[theme.breakpoints.up("sm")] = {
                width: "calc(100% - ".concat(drawerWidth, "px)"),
                marginLeft: drawerWidth,
            },
            _b),
        menuButton: (_c = {
                marginRight: theme.spacing(2)
            },
            _c[theme.breakpoints.up("sm")] = {
                display: "none",
            },
            _c),
        // necessary for content to be below app bar
        toolbar: theme.mixins.toolbar,
        drawerPaper: {
            width: drawerWidth,
        },
        content: {
            flexGrow: 1,
            padding: theme.spacing(3),
            marginBottom: '400px',
        },
    });
});
function ResponsiveDrawer() {
    var classes = useStyles();
    var theme = useTheme();
    var _a = React.useState(false), mobileOpen = _a[0], setMobileOpen = _a[1];
    var _b = useBloc(PreferencesCubit), darkMode = _b[0].darkMode, t = _b[1];
    var handleDrawerToggle = function () {
        setMobileOpen(!mobileOpen);
    };
    var drawer = (React.createElement("div", null,
        React.createElement("div", { className: classes.toolbar }),
        React.createElement(Divider, null),
        React.createElement(List, null,
            React.createElement(ListItem, { button: true, component: Link, to: "/sandbox" },
                React.createElement(ListItemIcon, null,
                    React.createElement(BugReportIcon, null)),
                React.createElement(ListItemText, { primary: "Sandbox" }))),
        React.createElement(Container, null,
            React.createElement(FormControlLabel, { control: React.createElement(Switch, { checked: darkMode, onChange: function () { return t.toggleTheme(); }, name: "Dark mode" }), label: "Dark Mode" }))));
    var container = document.body;
    return (React.createElement("div", { className: classes.root },
        React.createElement(AppBar, { position: "fixed", className: classes.appBar },
            React.createElement(Toolbar, null,
                React.createElement(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, className: classes.menuButton },
                    React.createElement(MenuIcon, null)),
                React.createElement(Typography, { variant: "h6", noWrap: true }, "Responsive drawer"))),
        React.createElement("nav", { className: classes.drawer, "aria-label": "mailbox folders" },
            React.createElement(Hidden, { smUp: true, implementation: "css" },
                React.createElement(Drawer, { container: container, variant: "temporary", anchor: theme.direction === "rtl" ? "right" : "left", open: mobileOpen, onClose: handleDrawerToggle, classes: {
                        paper: classes.drawerPaper,
                    }, ModalProps: {
                        keepMounted: true, // Better open performance on mobile.
                    } }, drawer)),
            React.createElement(Hidden, { xsDown: true, implementation: "css" },
                React.createElement(Drawer, { classes: {
                        paper: classes.drawerPaper,
                    }, variant: "permanent", open: true }, drawer))),
        React.createElement("main", { className: classes.content },
            React.createElement(Routes, null))));
}
ResponsiveDrawer.propTypes = {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    window: PropTypes.func,
};
export default ResponsiveDrawer;
