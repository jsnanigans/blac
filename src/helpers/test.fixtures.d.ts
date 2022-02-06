import Cubit from "../lib/Cubit";
import { BlocClass } from "../lib/types";
import { BlocObserverScope } from "../lib/BlocConsumer";
import Bloc from "../lib/Bloc";
export declare class Test1 extends Cubit<number> {
    constructor(options?: {
        register?: () => void;
    });
    increment: () => void;
}
export declare class ChangeListener extends Cubit<number> {
    constructor(notify: (bloc: any, state: any) => void, listenFor: BlocClass<any>, scope?: BlocObserverScope);
}
export declare class ValueChangeListener extends Cubit<number> {
    constructor(notify: (state: any) => void, listenFor: BlocClass<any>, scope?: BlocObserverScope);
    increment: () => void;
}
export declare enum AuthEvent {
    authenticated = "authenticated",
    unauthenticated = "unauthenticated"
}
export declare class TestBloc extends Bloc<AuthEvent, boolean> {
    constructor();
}
