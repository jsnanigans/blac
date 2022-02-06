import { BlocOptions } from "./types";
export interface Observer<T> {
    next: (v: any) => void;
}
export interface Subscription {
    unsubscribe: () => void;
}
export declare class BehaviorSubject<T> {
    isClosed: boolean;
    private prevValue;
    private value;
    private observers;
    constructor(initialValue: T);
    getValue(): T;
    subscribe(observer: Observer<T>): Subscription;
    complete(): void;
    next(value: T): void;
    private triggerObservers;
    private removeObserver;
}
declare type RemoveMethods = () => void;
export default class StreamAbstraction<T> {
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
export {};
