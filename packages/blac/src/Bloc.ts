import { Blac } from './Blac';
import { BlocBase } from './BlocBase';
import { BlocEventConstraint } from './types';

export abstract class Bloc<
  S, // State type
  A extends BlocEventConstraint = BlocEventConstraint, // Base Action/Event type with proper constraints
  P = unknown, // Props type
> extends BlocBase<S, P> {
  readonly eventHandlers: Map<
    new (...args: any[]) => A,
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
    eventConstructor: new (...args: any[]) => E,
    handler: (event: E, emit: (newState: S) => void) => void | Promise<void>,
  ): void {
    if (this.eventHandlers.has(eventConstructor)) {
      Blac.warn(
        `[Bloc ${this._name}:${String(this._id)}] Handler for event '${eventConstructor.name}' already registered. It will be overwritten.`,
      );
    }
    this.eventHandlers.set(
      eventConstructor,
      handler as (
        event: A,
        emit: (newState: S) => void,
      ) => void | Promise<void>,
    );
  }

  /**
   * Dispatches an action/event to the Bloc.
   * Events are queued and processed sequentially to prevent race conditions.
   * @param action The action/event instance to be processed.
   */
  public add = async (action: A): Promise<void> => {
    this._eventQueue.push(action);

    if (!this._isProcessingEvent) {
      await this._processEventQueue();
    }
  };

  /**
   * @internal
   * Processes events from the queue sequentially
   */
  private async _processEventQueue(): Promise<void> {
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
    const eventConstructor = action.constructor as new (...args: any[]) => A;
    const handler = this.eventHandlers.get(eventConstructor);

    if (handler) {
      const emit = (newState: S): void => {
        const previousState = this.state; // State just before this specific emission
        this._pushState(newState, previousState, action);
      };

      try {
        await handler(action, emit);
      } catch (error) {
        const constructorName =
          (action.constructor as { name?: string }).name ||
          'UnnamedConstructor';
        const errorContext = {
          blocName: this._name,
          blocId: String(this._id),
          eventType: constructorName,
          currentState: this.state,
          action: action,
          timestamp: new Date().toISOString(),
        };

        Blac.error(
          `[Bloc ${this._name}:${String(this._id)}] Error in event handler for '${constructorName}':`,
          error,
          'Context:',
          errorContext,
        );

        if (error instanceof Error && error.name === 'CriticalError') {
          throw error;
        }
      }
    } else {
      const constructorName =
        (action.constructor as { name?: string }).name || 'UnnamedConstructor';
      Blac.warn(
        `[Bloc ${this._name}:${String(this._id)}] No handler registered for action type: '${constructorName}'.`,
        'Registered handlers:',
        Array.from(this.eventHandlers.keys()).map((k) => k.name),
        'Action was:',
        action,
      );
    }
  }
}
