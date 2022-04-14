import React, { FC } from "react";
import { ThemeProvider } from "@material-ui/styles";
import { createTheme } from "@material-ui/core/styles";
import { orange, purple } from "@material-ui/core/colors";
import Content from "./Content";

const darkTheme = createTheme({
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

const DevTools: FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <Content />
    </ThemeProvider>
  );
};

export default DevTools;
