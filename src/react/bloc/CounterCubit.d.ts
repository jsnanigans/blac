import Cubit from "../../lib/Cubit";
export default class CounterCubit extends Cubit<number> {
    constructor(init?: number);
    increment: () => void;
    decrement: () => void;
}
export declare class CounterCubitTimer extends Cubit<number> {
    constructor(t?: number);
    increment: () => void;
}
export declare class CounterCubitTimerLocal extends CounterCubitTimer {
    constructor(timer: number);
}
