import {useBloc} from "../state";
import CounterCubit from "../bloc/CounterCubit";
import React from "react";

export default function Other() {
    const [value, {increment}] = useBloc<CounterCubit>(CounterCubit);
    return (
        <button onClick={() => increment()}>
            count is: {value}
        </button>
    )
}