import { Blac } from './Blac';
import { BlocBase } from './BlocBase';

// A should be the base type for all events this Bloc handles and must be an object type
// to access action.constructor. Events are typically class instances.
// P is for props, changed from any to unknown.
export abstract class Bloc<
    S, // State type
    A extends object, // Base Action/Event type, constrained to object
    P = unknown // Props type
> extends BlocBase<S, P> {
    // Stores handlers: Map<EventConstructor (subtype of A), HandlerFunction>
    // The handler's event parameter will be correctly typed to the specific EventConstructor
    // by the 'on' method's signature.
    readonly eventHandlers: Map<
        // Key: Constructor of a specific event E (where E extends A)
        // Using 'any[]' for constructor arguments for broader compatibility.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (...args: any[]) => A,
        // Value: Handler function. 'event: A' is used here for the stored function type.
        // The 'on' method ensures the specific handler (event: E) is correctly typed.
        (event: A, emit: (newState: S) => void) => void | Promise<void>
    > = new Map();

    /**
     * Registers an event handler for a specific event type.
     * This method is typically called in the constructor of a derived Bloc class.
     * @param eventConstructor The constructor of the event to handle (e.g., LoadDataEvent).
     * @param handler A function that processes the event and can emit new states.
     *                The 'event' parameter in the handler will be typed to the specific eventConstructor.
     */
    protected on<E extends A>(
        // Using 'any[]' for constructor arguments for broader compatibility.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventConstructor: new (...args: any[]) => E, 
        handler: (event: E, emit: (newState: S) => void) => void | Promise<void>
    ): void {
        if (this.eventHandlers.has(eventConstructor)) {
            // Using Blac.warn or a similar logging mechanism from BlocBase if available,
            // otherwise console.warn. Assuming this._name and this._id are available from BlocBase.
            Blac.warn(
                `[Bloc ${this._name}:${String(this._id)}] Handler for event '${eventConstructor.name}' already registered. It will be overwritten.`
            );
        }
        // Cast the specific handler (event: E) to a more general (event: A) for storage.
        // This is safe because E extends A. When the handler is called with an 'action' of type A,
        // if it was originally registered for type E, 'action' must be an instance of E.
        this.eventHandlers.set(
            eventConstructor,
            handler as (event: A, emit: (newState: S) => void) => void | Promise<void>
        );
    }

    /**
     * Dispatches an action/event to the Bloc.
     * If a handler is registered for this specific event type (via 'on'), it will be invoked.
     * Asynchronous handlers are awaited.
     * @param action The action/event instance to be processed.
     */
    public add = async (action: A): Promise<void> => {
        // Using 'any[]' for constructor arguments for broader compatibility.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventConstructor = action.constructor as new (...args: any[]) => A;
        const handler = this.eventHandlers.get(eventConstructor);

        if (handler) {
            // Define the 'emit' function that handlers will use to update state.
            // It captures the current state ('this.state') right before each emission
            // to provide the correct 'previousState' to _pushState.
            const emit = (newState: S): void => {
                const previousState = this.state; // State just before this specific emission
                // The 'action' passed to _pushState is the original action that triggered the handler,
                // providing context for the state change (e.g., for logging or plugins).
                this._pushState(newState, previousState, action);
            };

            try {
                // Await the handler in case it's an async function (e.g., performs API calls).
                // The 'action' is passed to the handler, and due to the way 'on' is typed,
                // the 'event' parameter within the handler function will be correctly
                // typed to its specific class (e.g., LoadMyFeatureData).
                await handler(action, emit);
            } catch (error) {
                // It's good practice to handle errors occurring within event handlers.
                Blac.error(
                    `[Bloc ${this._name}:${String(this._id)}] Error in event handler for '${eventConstructor.name}':`,
                    error,
                    "Action:", action
                );
                // Depending on the desired error handling strategy, you might:
                // 1. Emit a specific error state: this.emit(new MyErrorState(error));
                // 2. Re-throw the error: throw error;
                // 3. Log and ignore (as done here by default).
                // This should be decided based on application requirements.
            }
        } else {
            // action.constructor.name should be safe due to 'A extends object' and common JS practice for constructors.
            // If linting still complains, it might be overly strict for this common pattern.
            const constructorName = (action.constructor as { name?: string }).name || 'UnnamedConstructor';
            Blac.warn(
                `[Bloc ${this._name}:${String(this._id)}] No handler registered for action type: '${constructorName}'. Action was:`,
                action
            );
            // If no handler is found, the action is effectively ignored.
            // Consider if this is the desired behavior or if an error should be thrown
            // or a default handler should be invoked.
        }
    };
}
