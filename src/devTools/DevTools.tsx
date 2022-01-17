import React, { FC } from "react";
// import { ThemeProvider, Theme, StyledEngineProvider } from "@mui/styles";
import { createTheme } from "@mui/material/styles";
import { green, orange, purple } from "@mui/material/colors";
import Content from "./Content";
import { ThemeProvider } from "@mui/styles";


declare module '@mui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}


// const darkTheme = createTheme(adaptV4Theme({
//   palette: {
//     mode: "dark",
//     primary: {
//       // Purple and green play nicely together.
//       main: orange.A200
//     },
//     secondary: {
//       // This is green.A700 as hex.
//       main: purple.A200
//     }
//   }
// }));

const theme = createTheme({
  palette: {
    primary: {
      main: purple[500],
    },
    secondary: {
      main: green[500],
    },
  },
});


const DevTools: FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <Content />
    </ThemeProvider>
  );
};

export default DevTools;