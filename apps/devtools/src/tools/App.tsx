import type { FC } from "react";
import React from "react";
import "./state/ObserverPlugin";
import styled from "@emotion/styled";
import List from "./ui/List";

const AppFrame = styled.div`
  background-color: #000;
  color: #fff;
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  font-weight: 400;
`;


const App: FC = () => {
  return <AppFrame>
    <List />
  </AppFrame>;
};

export default App;
