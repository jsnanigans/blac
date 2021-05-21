import { Subscription } from 'rxjs';
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
    private readonly defaultAction;
    private createTransitionEvent;
    private createChangeEvent;
}

declare type BlocObserverScope = "local" | "global" | "all";
interface ProviderItem {
    id: number;
    parent?: number;
    bloc: BlocBase<any>;
}
declare class BlocConsumer {
    observer: BlocObserver;
    mocksEnabled: boolean;
    providerList: ProviderItem[];
    protected _blocMapLocal: Record<string, BlocBase<any>>;
    private blocListGlobal;
    private blocChangeObservers;
    private blocValueChangeObservers;
    private mockBlocs;
    constructor(blocs: BlocBase<any>[]);
    notifyChange(bloc: BlocBase<any>, state: any): void;
    notifyValueChange(bloc: BlocBase<any>): void;
    notifyTransition(bloc: BlocBase<any>, state: any, event: any): void;
    addBlocChangeObserver<T extends BlocBase<any>>(blocClass: BlocClass<T>, callback: (bloc: T, event: ChangeEvent<ValueType<T>>) => unknown, scope?: BlocObserverScope): void;
    addBlocValueChangeObserver<T extends BlocBase<any>>(blocClass: BlocClass<T>, callback: (bloc: T) => unknown, scope?: BlocObserverScope): void;
    addLocalBloc(item: ProviderItem): void;
    removeLocalBloc(id: number, bloc: BlocBase<any>): void;
    addBlocMock(bloc: BlocBase<any>): void;
    resetMocks(): void;
    getGlobalBloc(blocClass: BlocClass<any>): undefined | BlocBase<any>;
    getLocalBlocForProvider<T>(id: number, blocClass: BlocClass<T>): BlocBase<T> | undefined;
    protected getBlocInstance<T>(global: BlocBase<any>[], blocClass: BlocClass<T>): BlocBase<T> | undefined;
}

declare class StreamAbstraction<T> {
    protected readonly _options: BlocOptions;
    private _subject;
    constructor(initialValue: T, blocOptions?: BlocOptions);
    get state(): T;
    subscribe: (next?: ((value: any) => void) | undefined) => Subscription;
    complete: () => void;
    clearCache: () => void;
    jsonToState(state: string): T;
    stateToJson(state: T): string;
    protected next: (value: T) => void;
    protected getCachedValue: () => T | Error;
    protected updateCache: () => void;
}

declare class BlocBase<T> extends StreamAbstraction<T> {
    _localProviderRef: string;
    onRegister: null | ((consumer: BlocConsumer) => void);
    onChange: null | ((change: ChangeEvent<T>) => void);
    onValueChange: null | ((value: T) => void);
    constructor(initialValue: T, blocOptions?: BlocOptions);
    protected _consumer: BlocConsumer | null;
    set consumer(consumer: BlocConsumer);
    protected notifyChange: (state: T) => void;
    protected notifyValueChange: () => void;
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
    private readonly _blocsGlobal;
    private _contextLocalProviderKey;
    constructor(blocs: BlocBase<any>[]);
    useBloc: <T extends BlocBase<any>>(blocClass: BlocClass<T>, options?: BlocHookOptions<T>) => BlocHookData<T>;
    BlocBuilder<T extends BlocBase<any>>(props: {
        blocClass: BlocClass<T>;
        builder: (data: BlocHookData<T>) => ReactElement;
        shouldUpdate?: (event: ChangeEvent<ValueType<T>>) => boolean;
    }): ReactElement | null;
    BlocProvider<T extends BlocBase<any>>(props: {
        children?: ReactElement | ReactElement[];
        bloc: T | ((id: number) => T);
    }): ReactElement;
}

export { Bloc, BlocObserver, BlocReact, Cubit };
