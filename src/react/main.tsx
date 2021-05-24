import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";
import DevTools from "../devtools/DevTools";

ReactDOM.render(<App />, document.getElementById("root"));
ReactDOM.render(<DevTools />, document.getElementById("devtool"));
