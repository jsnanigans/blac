import { useBloc } from "../state";
import CounterCubit from "../bloc/CounterCubit";
import React from "react";
import { Button, ButtonGroup } from "@material-ui/core";

export default function Buttons() {
  const [, { increment, decrement }] = useBloc<CounterCubit>(CounterCubit, {
    subscribe: false
  });
  return (
    <div>
      <Button color="secondary" onClick={decrement}>
        DECREMENT
      </Button>
      <Button color="primary" onClick={increment}>
        INCREMENT
      </Button>
    </div>
  );
}
