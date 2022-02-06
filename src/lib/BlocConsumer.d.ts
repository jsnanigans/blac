import BlocBase from "./BlocBase";
import { BlocClass, ChangeEvent, ValueType } from "./types";
import BlocObserver from "./BlocObserver";
export interface ReactBlocOptions {
    /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
    debug?: boolean;
}
export declare type BlocObserverScope = "local" | "global" | "all";
export interface ProviderItem {
    id: string;
    parent?: string;
    bloc: BlocBase<any>;
}
export interface ConsumerOptions {
    observer?: BlocObserver;
}
export declare class BlocConsumer {
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
