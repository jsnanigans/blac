import type { FC } from "react";
import React from "react";
import { useBloc } from "@blac/react/src";
import { AppStateComponentsBloc } from "../state/ObserverPlugin";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const Frame = styled.div`
  display: flex;

  > div {
    padding: 1rem;
  }

  > div:first-child {
    height: 300px;
    overflow-y: auto;
  }
`;

const updateFlash = keyframes`
  0% {
    box-shadow: inset 0 0 0 0 transparent;
  }
  50% {
    box-shadow: inset 0 0 0 5px #4dccb5;
  }
  100% {
    box-shadow: inset 0 0 0 0 transparent;
  }
`;

const BlocItem = styled.div`
  cursor: pointer;
  animation: ${updateFlash} 0.1s ease-in-out;

  &.selected {
    text-decoration: underline;
  }
`;

const List: FC = () => {
  const [{ blocs, selectedBloc, selectedState, lastChanged }, { selectBloc }] = useBloc(AppStateComponentsBloc);
  return <Frame>
    <div>
      {blocs.map((bloc) => {
        return <BlocItem
          className={[bloc === selectedBloc ? "selected" : ""].filter(Boolean).join(" ")}
          onClick={() => {
            selectBloc(bloc);
          }}
        >{bloc.name}</BlocItem>;
      })}
    </div>
    {selectedBloc && <div>
      <p>Selected: {selectedBloc.name}</p>
      <p>
        State:
        <pre>
        {JSON.stringify(selectedState, null, 2)}
        </pre>
      </p>
    </div>}
  </Frame>;
};

export default List;
