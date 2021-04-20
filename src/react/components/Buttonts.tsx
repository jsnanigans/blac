import {useBloc} from "../state";
import CounterCubit from "../bloc/CounterCubit";
import React from "react";

export default function Buttons() {
    const [, {increment}] = useBloc<CounterCubit>(CounterCubit, {subscribe: false});
    return (
        <button onClick={increment}>
            INCREMENT
        </button>
    )
}