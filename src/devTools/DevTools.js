import React from "react";
import { ThemeProvider } from "@material-ui/styles";
import { createTheme } from "@material-ui/core/styles";
import { orange, purple } from "@material-ui/core/colors";
import Content from "./Content";
var darkTheme = createTheme({
    palette: {
        type: "dark",
        primary: {
            // Purple and green play nicely together.
            main: orange.A200
        },
        secondary: {
            // This is green.A700 as hex.
            main: purple.A200
        }
    }
});
var DevTools = function () {
    return React.createElement(ThemeProvider, { theme: darkTheme },
        React.createElement(Content, null));
};
export default DevTools;
