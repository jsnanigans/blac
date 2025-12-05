import { StateContainer } from './StateContainer';
import type {
  DiscriminatedEvent,
  EventWithMetadata,
  EventHandlerMap,
  VertexEventHandler,
} from '../types/events';

/**
 * Event-driven state container using discriminated union events.
 * Extends StateContainer with event-based state transitions and
 * compile-time exhaustive checking for event handlers.
 *
 * @template S - State type (must be an object)
 * @template E - Event union type (discriminated by 'type' property)
 * @template P - Props type (optional)
 *
 * @example
 * ```typescript
 * type CounterEvent =
 *   | { type: 'increment'; amount: number }
 *   | { type: 'decrement' }
 *   | { type: 'reset' };
 *
 * class CounterVertex extends Vertex<{ count: number }, CounterEvent> {
 *   constructor() {
 *     super({ count: 0 });
 *     this.createHandlers({
 *       increment: (event, emit) => {
 *         emit({ count: this.state.count + event.amount });
 *       },
 *       decrement: (_, emit) => {
 *         emit({ count: this.state.count - 1 });
 *       },
 *       reset: (_, emit) => {
 *         emit({ count: 0 });
 *       },
 *     });
 *   }
 *
 *   increment = (amount = 1) => this.add({ type: 'increment', amount });
 * }
 * ```
 */
export abstract class Vertex<
  S extends object = object,
  E extends DiscriminatedEvent = DiscriminatedEvent,
  P = undefined,
> extends StateContainer<S, P> {
  /** @internal */
  private handlers = new Map<string, VertexEventHandler<DiscriminatedEvent, S>>();
  /** @internal */
  private isProcessing = false;
  /** @internal */
  private eventQueue: EventWithMetadata<E>[] = [];

  constructor(initialState: S) {
    super(initialState);
  }

  /**
   * Register all event handlers with exhaustive type checking.
   * TypeScript will error if any event type from the union is missing.
   *
   * @param handlers - Map of event type to handler function
   */
  protected createHandlers(handlers: EventHandlerMap<E, S>): void {
    for (const [eventType, handler] of Object.entries(handlers)) {
      this.handlers.set(
        eventType,
        handler as VertexEventHandler<DiscriminatedEvent, S>,
      );
    }
  }

  /**
   * Dispatch an event for processing.
   * Events are processed synchronously; if called during processing,
   * the event is queued and processed after the current event completes.
   *
   * @param event - The event to process (must match the event union type)
   */
  public add = (event: E): void => {
    const enrichedEvent = this.enrichEvent(event);
    StateContainer._registry.emit('eventAdded', this, enrichedEvent);
    this.processEvent(enrichedEvent);
  };

  /** @internal */
  private enrichEvent(event: E): EventWithMetadata<E> {
    return {
      ...event,
      timestamp: Date.now(),
    };
  }

  /** @internal */
  private processEvent(event: EventWithMetadata<E>): void {
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

  /** @internal */
  private handleEvent(event: EventWithMetadata<E>): void {
    const handler = this.handlers.get(event.type);

    if (!handler) {
      if (this.debug) {
        console.warn(`No handler registered for event type: ${event.type}`);
      }
      return;
    }

    const emitFn = (state: S) => {
      this.emit(state);
    };

    try {
      handler(event, emitFn);
    } catch (error) {
      if (this.debug) {
        console.error(`Error handling event ${event.type}:`, error);
      }
      this.onEventError(event, error as Error);
    }
  }

  /**
   * Called when an error occurs during event processing.
   * Override to implement custom error handling.
   *
   * @param _event - The event that caused the error
   * @param _error - The error that occurred
   */
  protected onEventError(
    _event: EventWithMetadata<E>,
    _error: Error,
  ): void {}
}
