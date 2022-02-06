import React, { ReactElement } from "react";
import BlocBase from "../BlocBase";
import { BlocClass, BlocHookData, ChangeEvent, ValueType } from "../types";
import { BlocConsumer, ConsumerOptions } from "../BlocConsumer";
export interface ReactBlocOptions {
}
export interface BlocHookOptions<T extends BlocBase<any>> {
    subscribe?: boolean;
    shouldUpdate?: (event: ChangeEvent<ValueType<T>>) => boolean;
    create?: () => T;
}
export declare class BlocReact extends BlocConsumer {
    private providerCount;
    private readonly _blocsGlobal;
    private _contextLocalProviderKey;
    constructor(blocs: BlocBase<any>[], options?: ConsumerOptions);
    useBloc: <T extends BlocBase<any>>(blocClass: BlocClass<T>, options?: BlocHookOptions<T>) => BlocHookData<T>;
    BlocBuilder<T extends BlocBase<any>>(props: {
        blocClass: BlocClass<T>;
        builder: (data: BlocHookData<T>) => ReactElement;
        shouldUpdate?: (event: ChangeEvent<ValueType<T>>) => boolean;
    }): ReactElement | null;
    BlocProvider<T extends BlocBase<any>>(props: {
        children?: ReactElement | ReactElement[] | false;
        bloc: T | ((id: string) => T);
    }): ReactElement;
    withBlocProvider: <P extends object>(bloc: BlocBase<any> | (() => BlocBase<any>)) => (Component: React.ComponentType<P>) => React.ComponentType<P>;
}
