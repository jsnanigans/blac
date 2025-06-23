import { Blac } from './Blac';
import { BlocBase } from './BlocBase';
import { BlocEventConstraint } from './types';

// A should be the base type for all events this Bloc handles and must extend BlocEventConstraint
// to access action.constructor and ensure proper event structure.
// P is for props, changed from any to unknown.
export abstract class Bloc<
    S, // State type
    A extends BlocEventConstraint = BlocEventConstraint, // Base Action/Event type with proper constraints
    P = unknown // Props type
> extends BlocBase<S, P> {
    // Stores handlers: Map<EventConstructor (subtype of A), HandlerFunction>
    // The handler's event parameter will be correctly typed to the specific EventConstructor
    // by the 'on' method's signature.
    readonly eventHandlers: Map<
        // Key: Constructor of a specific event E (where E extends A)
        // TODO: 'any[]' is required for constructor arguments to allow flexible event instantiation.
        // Using specific parameter types would break type inference for events with different
        // constructor signatures. The 'any[]' enables polymorphic event handling while
        // maintaining type safety through the generic constraint 'E extends A'.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (...args: any[]) => A,
        // Value: Handler function. 'event: A' is used here for the stored function type.
        // The 'on' method ensures the specific handler (event: E) is correctly typed.
        (event: A, emit: (newState: S) => void) => void | Promise<void>
    > = new Map();

    /**
     * @internal
     * Event queue to ensure sequential processing of async events
     */
    private _eventQueue: A[] = [];
    
    /**
     * @internal
     * Flag indicating if an event is currently being processed
     */
    private _isProcessingEvent = false;

    /**
     * Registers an event handler for a specific event type.
     * This method is typically called in the constructor of a derived Bloc class.
     * @param eventConstructor The constructor of the event to handle (e.g., LoadDataEvent).
     * @param handler A function that processes the event and can emit new states.
     *                The 'event' parameter in the handler will be typed to the specific eventConstructor.
     */
    protected on<E extends A>(
        // TODO: 'any[]' is required for constructor arguments (see explanation above).
        // This allows events with different constructor signatures to be handled uniformly.
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
     * Events are queued and processed sequentially to prevent race conditions.
     * @param action The action/event instance to be processed.
     */
    public add = async (action: A): Promise<void> => {
        // Add event to queue
        this._eventQueue.push(action);
        
        // If not already processing, start processing the queue
        if (!this._isProcessingEvent) {
            await this._processEventQueue();
        }
    };

    /**
     * @internal
     * Processes events from the queue sequentially
     */
    private async _processEventQueue(): Promise<void> {
        // Prevent concurrent processing
        if (this._isProcessingEvent) {
            return;
        }
        
        this._isProcessingEvent = true;
        
        try {
            while (this._eventQueue.length > 0) {
                const action = this._eventQueue.shift()!;
                await this._processEvent(action);
            }
        } finally {
            this._isProcessingEvent = false;
        }
    }

    /**
     * @internal
     * Processes a single event
     */
    private async _processEvent(action: A): Promise<void> {
        // Using 'any[]' for constructor arguments for broader compatibility.
        // TODO: Type assertion required to cast action.constructor to proper event constructor type.
        // JavaScript's constructor property returns 'Function', but we need the specific event
        // constructor type to look up handlers. This is safe because we validate the action
        // extends the BlocEventConstraint interface.
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
                // Enhanced error handling with better context
                const constructorName = (action.constructor as { name?: string }).name || 'UnnamedConstructor';
                const errorContext = {
                    blocName: this._name,
                    blocId: String(this._id),
                    eventType: constructorName,
                    currentState: this.state,
                    action: action,
                    timestamp: new Date().toISOString()
                };
                
                Blac.error(
                    `[Bloc ${this._name}:${String(this._id)}] Error in event handler for '${constructorName}':`,
                    error,
                    "Context:", errorContext
                );
                
                // TODO: Consider implementing error boundary pattern
                // For now, we log and continue, but applications may want to:
                // 1. Emit an error state
                // 2. Re-throw the error  
                // 3. Call an error handler callback
                
                // Optional: Re-throw for critical errors (can be configured)
                if (error instanceof Error && error.name === 'CriticalError') {
                    throw error;
                }
            }
        } else {
            // Enhanced warning with more context
            const constructorName = (action.constructor as { name?: string }).name || 'UnnamedConstructor';
            Blac.warn(
                `[Bloc ${this._name}:${String(this._id)}] No handler registered for action type: '${constructorName}'.`,
                "Registered handlers:", Array.from(this.eventHandlers.keys()).map(k => k.name),
                "Action was:", action
            );
        }
    }
}
