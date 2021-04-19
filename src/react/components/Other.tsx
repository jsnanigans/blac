import {useBloc} from "../state";
import CounterBloc from "../bloc/CounterBloc";
import React from "react";

export default function Other() {
    const [value, {increment}] = useBloc<CounterBloc>(CounterBloc);
    return (
        <button onClick={() => increment()}>
            count is: {value}
        </button>
    )
}