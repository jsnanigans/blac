import { Subscription } from 'rxjs';
import React, { ReactElement } from 'react';

declare type ValueType<T extends BlocBase<any>> = T extends BlocBase<infer U> ? U : never;
declare type BlocClass<T> = new (...args: never[]) => T;
declare type BlocHookData<T extends BlocBase<any>> = [
    value: ValueType<T>,
    instance: T
];
interface BlocOptions {
    persistKey?: string;
    persistData?: boolean;
}
interface ChangeEvent<T> {
    currentState: T;
    nextState: T;
}
interface TransitionEvent<T, E> {
    currentState: T;
    event: E;
    nextState: T;
}

interface BlocObserverOptions {
    onChange?: (bloc: BlocBase<any>, event: ChangeEvent<any>) => void;
    onTransition?: (bloc: BlocBase<any>, event: TransitionEvent<any, any>) => void;
}
declare class BlocObserver {
    onChange: (bloc: BlocBase<any>, event: ChangeEvent<any>) => void;
    onTransition: (bloc: BlocBase<any>, event: TransitionEvent<any, any>) => void;
    constructor(methods?: BlocObserverOptions);
    readonly addChange: (bloc: BlocBase<any>, state: any) => void;
    readonly addTransition: (bloc: BlocBase<any>, state: any, event: any) => void;
    private createTransitionEvent;
    private createChangeEvent;
}

interface ReactBlocOptions$1 {
    /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
    debug?: boolean;
}
declare type BlocObserverScope = "local" | "global" | "all";
declare class BlocConsumer {
    observer: BlocObserver;
    debug: boolean;
    readonly blocListGlobal: BlocBase<any>[];
    protected _blocMapLocal: Record<string, BlocBase<any>>;
    private blocObservers;
    constructor(blocs: BlocBase<any>[], options?: ReactBlocOptions$1);
    notifyChange(bloc: BlocBase<any>, state: any): void;
    notifyTransition(bloc: BlocBase<any>, state: any, event: any): void;
    addBlocObserver<T extends BlocBase<any>>(blocClass: BlocClass<T>, callback: (bloc: T, event: ChangeEvent<T>) => unknown, scope?: BlocObserverScope): void;
    addLocalBloc(key: string, bloc: BlocBase<any>): void;
    removeLocalBloc(key: string): void;
}

declare class StreamAbstraction<T> {
    protected readonly _options: BlocOptions;
    private _subject;
    constructor(initialValue: T, blocOptions?: BlocOptions);
    get state(): T;
    subscribe: (next?: ((value: T) => void) | undefined, error?: ((error: any) => void) | undefined, complete?: (() => void) | undefined) => Subscription;
    complete: () => void;
    clearCache: () => void;
    protected next: (value: T) => void;
    protected parseFromCache: (state: string) => T;
    protected parseToCache: (state: T) => string;
    protected getCachedValue: () => T | Error;
    protected updateCache: () => void;
}

declare class BlocBase<T> extends StreamAbstraction<T> {
    _localProviderRef: string;
    onRegister: null | ((consumer: BlocConsumer) => void);
    onChange: null | ((change: ChangeEvent<T>) => void);
    constructor(initialValue: T, blocOptions?: BlocOptions);
    protected _consumer: BlocConsumer | null;
    set consumer(consumer: BlocConsumer);
    protected notifyChange: (state: T) => void;
}

declare class Bloc<E, T> extends BlocBase<T> {
    onTransition: null | ((change: {
        currentState: T;
        event: E;
        nextState: T;
    }) => void);
    protected mapEventToState: null | ((event: E) => T);
    constructor(initialState: T, options?: BlocOptions);
    add: (event: E) => void;
    protected notifyTransition: (state: T, event: E) => void;
}

declare class Cubit<T> extends BlocBase<T> {
    protected emit: (value: T) => void;
}

interface ReactBlocOptions {
    /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
    debug?: boolean;
}
interface BlocHookOptions<T extends BlocBase<any>> {
    subscribe?: boolean;
    shouldUpdate?: (previousState: ValueType<T>, state: ValueType<T>) => boolean;
}
declare class BlocReact extends BlocConsumer {
    private readonly _contextGlobal;
    private _contextLocalProviderKey;
    constructor(blocs: BlocBase<any>[], options?: ReactBlocOptions);
    useBloc: <T extends BlocBase<any>>(blocClass: BlocClass<T>, options?: BlocHookOptions<T>) => BlocHookData<T>;
    BlocBuilder: <T extends BlocBase<any>>(props: {
        blocClass: BlocClass<T>;
        builder: (data: BlocHookData<T>) => ReactElement;
        shouldUpdate?: ((previousState: ValueType<T>, state: ValueType<T>) => boolean) | undefined;
    }) => ReactElement | null;
    BlocProvider: <T extends BlocBase<any>>(props: {
        children?: React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactElement<any, string | React.JSXElementConstructor<any>>[] | undefined;
        create: (providerKey: string) => T;
    }) => ReactElement;
}

export { Bloc, BlocReact, Cubit };
