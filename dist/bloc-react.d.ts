import { ReactElement } from 'react';

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
    readonly addBlocAdded: (bloc: BlocBase<any>) => void;
    readonly addBlocRemoved: (bloc: BlocBase<any>) => void;
    private readonly defaultAction;
    onBlocAdded: (bloc: BlocBase<any>) => void;
    onBlocRemoved: (bloc: BlocBase<any>) => void;
    private createTransitionEvent;
    private createChangeEvent;
}

declare type BlocObserverScope = "local" | "global" | "all";
interface ProviderItem {
    id: string;
    parent?: string;
    bloc: BlocBase<any>;
}
interface ConsumerOptions {
    observer?: BlocObserver;
}
declare class BlocConsumer {
    observer: BlocObserver;
    mocksEnabled: boolean;
    providerList: ProviderItem[];
    private blocListGlobal;
    private blocChangeObservers;
    private blocValueChangeObservers;
    private mockBlocs;
    constructor(blocs: BlocBase<any>[], options?: ConsumerOptions);
    notifyChange(bloc: BlocBase<any>, state: any): void;
    notifyValueChange(bloc: BlocBase<any>): void;
    notifyTransition(bloc: BlocBase<any>, state: any, event: any): void;
    addBlocChangeObserver<T extends BlocBase<any>>(blocClass: BlocClass<T>, callback: (bloc: T, event: ChangeEvent<ValueType<T>>) => unknown, scope?: BlocObserverScope): void;
    addBlocValueChangeObserver<T extends BlocBase<any>>(blocClass: BlocClass<T>, callback: (bloc: T) => unknown, scope?: BlocObserverScope): void;
    addLocalBloc(item: ProviderItem): void;
    removeLocalBloc(id: string, bloc: BlocBase<any>): void;
    addBlocMock(bloc: BlocBase<any>): void;
    resetMocks(): void;
    getGlobalBloc(blocClass: BlocClass<any>): undefined | BlocBase<any>;
    getLocalBlocForProvider<T>(id: string, blocClass: BlocClass<T>): BlocBase<T> | undefined;
    protected getGlobalBlocInstance<T>(global: BlocBase<any>[], blocClass: BlocClass<T>): BlocBase<T> | undefined;
}

interface Observer<T> {
    next: (v: any) => void;
}
interface Subscription {
    unsubscribe: () => void;
}
declare type RemoveMethods = () => void;
declare class StreamAbstraction<T> {
    isClosed: boolean;
    removeListeners: Array<RemoveMethods>;
    protected readonly _options: BlocOptions;
    private _subject;
    constructor(initialValue: T, blocOptions?: BlocOptions);
    get state(): T;
    readonly removeRemoveListener: (index: number) => void;
    readonly addRemoveListener: (method: RemoveMethods) => () => void;
    subscribe: (observer: Observer<T>) => Subscription;
    complete: () => void;
    clearCache: () => void;
    jsonToState(state: string): T;
    stateToJson(state: T): string;
    protected next: (value: T) => void;
    protected getCachedValue: () => T | Error;
    protected updateCache: () => void;
}

interface BlocMeta {
    scope: 'unknown' | 'local' | 'global';
}
declare type ChangeMethod = <T>(change: ChangeEvent<T>, bloc: BlocBase<T>) => void;
declare type RegisterMethod = <T>(consumer: BlocConsumer, bloc: BlocBase<T>) => void;
declare type ValueChangeMethod = <T>(value: T, bloc: BlocBase<T>) => void;
declare class BlocBase<T> extends StreamAbstraction<T> {
    id: string;
    createdAt: Date;
    meta: BlocMeta;
    changeListeners: ChangeMethod[];
    registerListeners: RegisterMethod[];
    valueChangeListeners: ValueChangeMethod[];
    consumer: BlocConsumer | null;
    constructor(initialValue: T, blocOptions?: BlocOptions);
    readonly removeChangeListener: (index: number) => void;
    readonly addChangeListener: (method: ChangeMethod) => () => void;
    readonly removeValueChangeListener: (index: number) => void;
    readonly addValueChangeListener: (method: ValueChangeMethod) => () => void;
    readonly removeRegisterListener: (index: number) => void;
    readonly addRegisterListener: (method: RegisterMethod) => () => void;
    readonly notifyChange: (state: T) => void;
    readonly notifyValueChange: () => void;
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
    emit: (value: T) => void;
}

interface BlocHookOptions<T extends BlocBase<any>> {
    subscribe?: boolean;
    shouldUpdate?: (event: ChangeEvent<ValueType<T>>) => boolean;
}
declare class BlocReact extends BlocConsumer {
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
        children?: ReactElement | ReactElement[];
        bloc: T | ((id: string) => T);
    }): ReactElement;
}

export { Bloc, BlocObserver, BlocReact, Cubit };
