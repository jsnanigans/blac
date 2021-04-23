import { BehaviorSubject, Subscription } from 'rxjs';
import React, { ReactElement } from 'react';

interface BlocOptions {
    persistKey?: string;
    persistData?: boolean;
}
declare class BlocBase<T> {
    onChange: null | ((change: {
        currentState: T;
        nextState: T;
    }) => void);
    _localProviderRef: string;
    private readonly _subject;
    private readonly _options;
    constructor(initialValue: T, cubitOptions?: BlocOptions);
    get subject(): BehaviorSubject<T>;
    get state(): T;
    set persistData(setTo: boolean);
    getValue: () => T;
    subscribe: (next?: ((value: T) => void) | undefined, error?: ((error: any) => void) | undefined, complete?: (() => void) | undefined) => Subscription;
    protected parseFromCache: (value: string) => T;
    protected parseToCache: (value: T) => string;
    protected notifyChange: (value: T) => void;
    protected getCachedValue: () => T | undefined;
    protected updateCache: () => void;
    protected clearCache: () => void;
}

declare class Bloc<E, T> extends BlocBase<T> {
    mapEventToState: (event: E) => T;
    onTransition: null | ((change: {
        currentState: T;
        event: E;
        nextState: T;
    }) => void);
    constructor(initialState: T, options?: BlocOptions);
    add: (event: E) => void;
    protected notifyTransition: (value: T, event: E) => void;
}

declare class Cubit<T> extends BlocBase<T> {
    protected emit: (value: T) => void;
}

interface BlocLordOptions {
    /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
    debug?: boolean;
}
declare type ValueType<T extends BlocBase<any>> = T extends BlocBase<infer U> ? U : never;
declare type BlocHookData<T extends BlocBase<any>> = [
    value: ValueType<T>,
    instance: T,
    stream: {
        error: any;
        complete: boolean;
    }
];
interface BlocHookOptions<T extends BlocBase<any>> {
    subscribe?: boolean;
    shouldUpdate?: (previousState: ValueType<T>, state: ValueType<T>) => boolean;
}
declare class BlocReact {
    observer: null | ((bloc: BlocBase<any>, value: any) => void);
    debug: boolean;
    private readonly _blocListGlobal;
    private readonly _contextGlobal;
    private _contextLocalProviderKey;
    private _blocMapLocal;
    constructor(blocs: BlocBase<any>[], options?: BlocLordOptions);
    notify(bloc: BlocBase<ValueType<any>>, value: ValueType<any>): void;
    useBloc: <T extends BlocBase<any>>(blocClass: new (...args: never[]) => T, options?: BlocHookOptions<T>) => BlocHookData<T>;
    BlocBuilder: <T extends BlocBase<any>>(props: {
        bloc: new (...args: never[]) => T;
        builder: (data: BlocHookData<T>) => ReactElement;
        shouldUpdate?: ((previousState: ValueType<T>, state: ValueType<T>) => boolean) | undefined;
    }) => ReactElement;
    GlobalBlocProvider: (props: {
        children?: ReactElement | ReactElement[];
    }) => ReactElement;
    BlocProvider: <T extends BlocBase<any>>(props: {
        children?: React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactElement<any, string | React.JSXElementConstructor<any>>[] | undefined;
        create: (providerKey: string) => T;
    }) => ReactElement;
}

export { Bloc, BlocReact, Cubit };
