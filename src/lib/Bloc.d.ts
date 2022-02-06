import BlocBase from "./BlocBase";
import { BlocOptions } from "./types";
declare type EventHandler<E, T> = (event: E, emit: (state: T) => void) => void | Promise<void>;
export default class Bloc<E, T> extends BlocBase<T> {
    onTransition: null | ((change: {
        currentState: T;
        event: E;
        nextState: T;
    }) => void);
    /**
     * @deprecated The method is deprecated. Use `on` to add your event handlers instead.
     */
    protected mapEventToState: null | ((event: E) => T);
    eventHandlers: [E, EventHandler<E, T>][];
    constructor(initialState: T, options?: BlocOptions);
    add: (event: E) => void;
    private emit;
    /**
     * Add a listener to the Bloc for when a new event is added. There can only be one handler for each event.
     * @param event The event that was added to the Bloc
     * @param handler A method that receives the event and a `emit` function that can be used to update the state
     */
    readonly on: (event: E, handler: EventHandler<E, T>) => void;
    protected notifyTransition: (state: T, event: E) => void;
}
export {};
