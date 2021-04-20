import {useBloc} from "../state";
import CounterCubit from "../bloc/CounterCubit";
import React from "react";
import {Button} from "@material-ui/core";

export default function Buttons() {
    const [, {increment}] = useBloc<CounterCubit>(CounterCubit, {subscribe: false});
    return (
        <Button color="primary" onClick={increment}>
            INCREMENT
        </Button>
    )
}