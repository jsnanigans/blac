import {useBloc} from "../state";
import CounterBloc from "../bloc/CounterBloc";
import React from "react";

export default function Buttons() {
    const [, {increment}] = useBloc<CounterBloc>(CounterBloc, {subscribe: false});
    return (
        <button onClick={increment}>
            INCREMENT
        </button>
    )
}