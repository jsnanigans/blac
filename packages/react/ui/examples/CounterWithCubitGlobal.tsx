import React, { FC } from "react";
import { useBloc } from "../../src";
import { CounterGlobalCubit } from "./blacState";

const Counter: FC = () => {
    const [count, { increment, decrement }] = useBloc(CounterGlobalCubit);
    return (
        <>
            <button onClick={decrement}>-</button>
            {` ${count} `}
            <button onClick={increment}>+</button>
        </>
    );
};

const CounterWithCubitGlobal: FC = () => {
    return (
        <>
            <Counter />
            <hr />
            <Counter />
        </>
    );
};

export default CounterWithCubitGlobal;
