import React from "react";
import Layout from "./Layout";
import { createTheme, adaptV4Theme } from "@mui/material/styles";
import { ThemeProvider, Theme, StyledEngineProvider } from "@mui/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { blue, green, orange, purple } from "@mui/material/colors";
import { BrowserRouter as Router } from "react-router-dom";
import { useBloc } from "../state";
import PreferencesCubit from "../bloc/PreferencesCubit";



declare module '@mui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}



declare module '@mui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}


const darkTheme = createTheme({
  palette: {
    mode: "dark",
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
    mode: "light",
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
