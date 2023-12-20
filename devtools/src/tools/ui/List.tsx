import type { FC, ReactNode } from "react";
import React from "react";
import { useBloc } from "@blac/react/src";
import { AppStateComponentsBloc, BlocItem } from "../state/AppStateComponentsBloc";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const Frame = styled.div`
  display: flex;
  color: #fff;
  background: #000;


  div, p, h6, pre {
    display: block;
  }


  h6 {
    font-size: 0.8rem;
    font-weight: bold;
    margin: 0;
    padding: 0.5rem;
    text-transform: uppercase;

  }

  > div:first-of-type {
    height: 100dvh;
    overflow-y: auto;
  }
`;

const moveLine = keyframes`
  0% {
    right: 0;
  }

  100% {
    right: 100%;
  }
`;

const BlocItemWrap = styled.div`
  cursor: pointer;
  display: block;
  position: relative;
  overflow: hidden;
  padding: 0.5rem 1rem;

  &.selected {
    text-decoration: underline;
  }

  .line {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 3px;
    background: #4dccb5;
    animation: ${moveLine} 0.4s ease-in forwards;
  }
`;

const BlocItem: FC<{ className?: string; onClick: () => void, children: ReactNode, changedKey?: string }> = (props) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let mounted = true;
    const newLine = document.createElement("div");
    newLine.className = "line";
    ref.current?.appendChild(newLine);

    setTimeout(() => {
      if (!mounted) return;
      newLine.remove();
    }, 500);
  }, [props.changedKey]);

  return <BlocItemWrap
    className={props.className}
    onClick={props.onClick}
    ref={ref}
  >
    {props.children}
  </BlocItemWrap>;
};

const EditState: FC<{ bloc: BlocItem }> = ({ bloc }) => {
  const state = bloc.state;
  let fields = typeof state === "object" ? { ...state } : state;
  const fullStateType = typeof state;
  const isCubit = bloc.isCubit;

  // create fields object if state is string, number, boolean
  if (typeof fields !== "object") {
    fields = {
      value: state
    };
  }


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCubit) {
      return;
    }
    const newFields = { ...fields };
    const target = event.target;
    const value = target.value;
    const name = target.name;

    const originalType = typeof newFields[name];
    if (originalType === "number") {
      newFields[name] = Number(value);
    } else if (originalType === "boolean") {
      newFields[name] = target.checked;
    } else {
      newFields[name] = value;
    }


    if (fullStateType === "number" || fullStateType === "boolean" || fullStateType === "string") {
      // bloc.emit(newFields[name]);
      return;
    }

    // bloc.emit(newFields);
  };

  if (!isCubit) {
    return <><h6>State:</h6>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </>;
  }

  return <div>
    {Object.keys(fields).map((key) => {
        let type = "text";
        let checked = false;
        if (typeof fields[key] === "number") {
          type = "number";
        } else if (typeof fields[key] === "boolean") {
          type = "checkbox";
          checked = fields[key];
        }

        return <label key={key}>
          <h6>{key}</h6>
          <input type={type} checked={checked} name={key} value={fields[key]} onChange={handleInputChange} />
        </label>;
      }
    )}
  </div>;
};

const BlocDetails = styled.div`
  padding: 1rem;
  flex: 1;
`;

const List: FC = () => {
  const [{ blocs, selectedBloc, selectedState }, {
    selectBloc,
    getBlocChanges,
    getBlocKey,
    disposeBloc
  }] = useBloc(AppStateComponentsBloc, "appState");

  const nonIsolatedBlocs = blocs.filter(b => !b.isIsolated);

  return <Frame>
    <div>
      {nonIsolatedBlocs.map((bloc) => {
        return <BlocItem
          className={[bloc.id === selectedBloc ? "selected" : ""].filter(Boolean).join(" ")}
          key={`${bloc.name}#${bloc.id}`}
          changedKey={getBlocKey(bloc)}
          onClick={() => {
            selectBloc(bloc);
          }}
        >{bloc.name}{bloc.id !== bloc.name && <>#{bloc.id}</>}</BlocItem>;
      })}
    </div>
    {selectedBloc && <BlocDetails>
      <p>Selected: {selectedBloc.name}</p>
      {/*<button onClick={() => disposeBloc(selectedBloc)}>Dispose</button>*/}
      {selectedBloc.id !== selectedBloc.name && <p>ID: {selectedBloc.id}</p>}
      {selectedState ? <div>
          {/*<EditState bloc={selectedBloc as any} />*/}
          <h6>State:</h6>
          <pre>{JSON.stringify(selectedState, null, 2)}</pre>
        </div> :
        <p>State cannot be shown as string</p>}
    </BlocDetails>}
  </Frame>;
};

export default List;
