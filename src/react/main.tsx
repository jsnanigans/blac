import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";
import { GlobalBlocProvider } from "./state";

ReactDOM.render(
  <GlobalBlocProvider>
    <App />
  </GlobalBlocProvider>,
  document.getElementById("root")
);
