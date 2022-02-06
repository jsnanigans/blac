import React from "react";
import Layout from "./Layout";
import { createTheme } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import { orange, purple } from "@material-ui/core/colors";
import { BrowserRouter as Router } from "react-router-dom";
import { useBloc } from "../state";
import PreferencesCubit from "../bloc/PreferencesCubit";
var darkTheme = createTheme({
    palette: {
        type: "dark",
        primary: {
            // Purple and green play nicely together.
            main: orange.A200,
        },
        secondary: {
            // This is green.A700 as hex.
            main: purple.A200,
        },
    },
});
var lightTheme = createTheme({
    palette: {
        type: "light",
        primary: {
            // Purple and green play nicely together.
            main: purple[500],
        },
        secondary: {
            // This is green.A700 as hex.
            main: "#11cb5f",
        },
    },
});
function App() {
    var darkMode = useBloc(PreferencesCubit)[0].darkMode;
    return (React.createElement(ThemeProvider, { theme: darkMode ? darkTheme : lightTheme },
        React.createElement(CssBaseline, null),
        React.createElement(Router, null,
            React.createElement(Layout, null))));
}
export default App;
