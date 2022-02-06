import BlocBase from "./BlocBase";
import { ChangeEvent, TransitionEvent } from "./types";
export interface BlocObserverOptions {
    onChange?: (bloc: BlocBase<any>, event: ChangeEvent<any>) => void;
    onTransition?: (bloc: BlocBase<any>, event: TransitionEvent<any, any>) => void;
}
export default class BlocObserver {
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
