import React from "react";
import Layout from "./Layout";
import { createTheme } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import { blue, green, orange, purple } from "@material-ui/core/colors";
import { BrowserRouter as Router } from "react-router-dom";
import { useBloc } from "../state";
import PreferencesCubit from "../bloc/PreferencesCubit";

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

const lightTheme = createTheme({
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
  const [{ darkMode }] = useBloc<PreferencesCubit>(PreferencesCubit);
  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Router>
        <Layout />
      </Router>
    </ThemeProvider>
  );
}

export default App;
