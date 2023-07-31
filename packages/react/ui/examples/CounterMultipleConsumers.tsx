import { Cubit } from "blac";
import React, { FC, ReactNode } from "react";
import { useBloc } from "../../src";
import Scope from "./Scope";


export class CounterCubit extends Cubit<number> {
    static create = () => new CounterCubit(0);

    increment = () => {
        this.emit(this.state + 1);
    };
}

const instance = CounterCubit.create();

const LocalCounter: FC<{ children?: ReactNode; name: string; cubit?: any }> = ({
                                                                                   children,
                                                                                   name
                                                                               }) => {
    const [count, { increment }] = useBloc(instance);

    return (
        <div>
            <strong>
                {name}
                {": "}
            </strong>
            <button onClick={increment}>
                <>{count} - Increment</>
            </button>
            {children}
        </div>
    );
};


const CounterMultipleConsumers: FC = () => {
    return (
        <div>
            <Scope name="Consumer A">
                <LocalCounter name="A" />
            </Scope>

            <Scope name="Consumer B">
                <LocalCounter name="B" />
            </Scope>
        </div>
    );
};

export default CounterMultipleConsumers;
