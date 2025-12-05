import { StateContainer } from './StateContainer';
import { BaseEvent } from '../types/events';

/**
 * Handler function for processing events in Vertex
 * @template E - Event type
 * @template S - State type
 * @param event - The event being handled
 * @param emit - Function to emit new state
 */
export type EventHandler<E extends BaseEvent, S> = (
  event: E,
  emit: (state: S) => void,
) => void;

/**
 * Constructor type for event classes
 * @template T - Event type
 */
export type EventConstructor<T extends BaseEvent = BaseEvent> = new (
  ...args: never[]
) => T;

interface EventHandlerRegistration<E extends BaseEvent, S> {
  eventClass: EventConstructor<E>;
  handler: EventHandler<E, S>;
}

/**
 * Event-driven state container that processes events to update state.
 * Use with event handlers registered via the on() method.
 *
 * @template S - State type
 * @template E - Event type (extends BaseEvent)
 * @template P - Props type (optional)
 */
export abstract class Vertex<
  S extends object = object,
  E extends BaseEvent = BaseEvent,
  P = undefined,
> extends StateContainer<S, P> {
  private eventHandlers = new Map<string, EventHandlerRegistration<E, S>[]>();
  private isProcessing = false;
  private eventQueue: E[] = [];

  constructor(initialState: S) {
    super(initialState);
  }

  /**
   * Register a handler for a specific event type
   * @param EventClass - The event class constructor
   * @param handler - Function to handle events of this type
   */
  protected on = <T extends E>(
    EventClass: EventConstructor<T>,
    handler: EventHandler<T, S>,
  ): void => {
    const className = EventClass.name;
    const registrations = this.eventHandlers.get(className) || [];
    registrations.push({
      eventClass: EventClass as EventConstructor<E>,
      handler: handler as EventHandler<E, S>,
    });
    this.eventHandlers.set(className, registrations);
  };

  /**
   * Add an event to the event stream for processing
   * @param event - The event to process
   */
  public add = (event: E): void => {
    StateContainer._registry.emit('eventAdded', this, event);
    this.processEvent(event);
  };

  private processEvent(event: E): void {
    if (this.isProcessing) {
      this.eventQueue.push(event);
      return;
    }

    this.isProcessing = true;

    try {
      this.handleEvent(event);

      while (this.eventQueue.length > 0) {
        const nextEvent = this.eventQueue.shift()!;
        this.handleEvent(nextEvent);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private handleEvent(event: E): void {
    const className = event.constructor.name;
    const registrations = this.eventHandlers.get(className);

    if (!registrations || registrations.length === 0) {
      if (this.debug) {
        console.warn(`No handler registered for event: ${className}`);
      }
      return;
    }

    const emitFn = (state: S) => {
      this.emit(state);
    };

    for (const registration of registrations) {
      try {
        registration.handler(event, emitFn);
      } catch (error) {
        if (this.debug) {
          console.error(`Error handling event ${className}:`, error);
        }
        this.onEventError(event, error as Error);
      }
    }
  }

  /**
   * Handle errors that occur during event processing.
   * Override this method to implement custom error handling.
   * @param _event - The event that caused the error
   * @param _error - The error that occurred
   */
  protected onEventError(_event: E, _error: Error): void {}
}
