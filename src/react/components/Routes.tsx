import { Route, Switch } from "react-router-dom";
import Sandbox from "./Sandbox";
import React from "react";

export default function Routes() {
  return (
    <Switch>
      <Route path="/">
        <Sandbox />
      </Route>
      <Route path="/sandbox">
        <Sandbox />
      </Route>
    </Switch>
  );
}
