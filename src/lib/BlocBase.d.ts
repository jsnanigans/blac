import { BlocConsumer } from "./BlocConsumer";
import StreamAbstraction from "./StreamAbstraction";
import { BlocOptions, ChangeEvent } from "./types";
export interface BlocMeta {
    scope: 'unknown' | 'local' | 'global';
}
declare type ChangeMethod = <T>(change: ChangeEvent<T>, bloc: BlocBase<T>) => void;
declare type RegisterMethod = <T>(consumer: BlocConsumer, bloc: BlocBase<T>) => void;
declare type ValueChangeMethod = <T>(value: T, bloc: BlocBase<T>) => void;
export default class BlocBase<T> extends StreamAbstraction<T> {
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
export {};
