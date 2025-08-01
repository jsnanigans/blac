/**
 * Bloc v3.0.0 - Full generator implementation
 * Simplified event processing using generators throughout
 */

import { Blac } from './Blac';
import { BlocBase } from './BlocBase';
import { BlocEventConstraint } from './types';

export abstract class Bloc<
  S,
  A extends BlocEventConstraint = BlocEventConstraint,
> extends BlocBase<S> {
  readonly eventHandlers: Map<
    new (...args: any[]) => A,
    (event: A, emit: (newState: S) => void) => void | Promise<void>
  > = new Map();

  /**
   * Generator-based event channel for efficient processing
   */
  private _eventChannel: AsyncGenerator<A, void, void>;
  private _eventSender: (event: A) => void;
  private _eventProcessor: Promise<void>;
  
  /**
   * Event stream for external consumption
   */
  private _eventStreamChannel: {
    send: (event: A) => void;
    generator: AsyncGenerator<A, void, void>;
  };

  constructor(initialState: S) {
    super(initialState);

    // Create event channels
    const { channel, sender } = this._createEventChannel();
    this._eventChannel = channel;
    this._eventSender = sender;
    
    // Create event stream channel for external consumption
    this._eventStreamChannel = this._createEventStreamChannel();

    // Start processing events
    this._eventProcessor = this._processEvents();

    // Cleanup on dispose
    const originalDispose = this.onDispose;
    this.onDispose = () => {
      originalDispose?.();
      // Signal channel closure
      this._eventSender(null as any);
    };
  }

  /**
   * Creates the main event processing channel
   */
  private _createEventChannel(): {
    channel: AsyncGenerator<A, void, void>;
    sender: (event: A) => void;
  } {
    const queue: A[] = [];
    let resolver: ((value: A | null) => void) | null = null;
    let closed = false;

    const channel = (async function* (): AsyncGenerator<A, void, void> {
      while (!closed) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          const event = await new Promise<A | null>((resolve) => {
            resolver = resolve;
          });

          if (event === null) {
            closed = true;
            break;
          }

          yield event;
        }
      }
    })();

    const sender = (event: A | null) => {
      if (event === null) {
        closed = true;
        if (resolver) {
          resolver(null);
          resolver = null;
        }
        return;
      }

      if (resolver) {
        resolver(event);
        resolver = null;
      } else {
        queue.push(event);
      }
    };

    return { channel, sender };
  }

  /**
   * Creates event stream channel for external consumption
   */
  private _createEventStreamChannel(): {
    send: (event: A) => void;
    generator: AsyncGenerator<A, void, void>;
  } {
    const queue: A[] = [];
    const resolvers: ((value: { event: A } | { done: true }) => void)[] = [];
    let closed = false;

    const generator = (async function* (): AsyncGenerator<A, void, void> {
      while (!closed) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          const result = await new Promise<{ event: A } | { done: true }>(
            (resolve) => {
              resolvers.push(resolve);
            },
          );

          if ('event' in result) {
            yield result.event;
          } else {
            break;
          }
        }
      }
    })();

    return {
      send: (event: A) => {
        if (closed) return;

        if (resolvers.length > 0) {
          const resolver = resolvers.shift()!;
          resolver({ event });
        } else {
          queue.push(event);
        }
      },
      generator,
    };
  }

  /**
   * Main event processing loop
   */
  private async _processEvents(): Promise<void> {
    try {
      for await (const event of this._eventChannel) {
        if (this.isDisposed) break;
        
        // Process the event
        await this._handleEvent(event);
        
        // Send to event stream
        this._eventStreamChannel.send(event);
      }
    } catch (error) {
      if (!this.isDisposed) {
        console.error(`[Bloc ${this._name}] Error in event processor:`, error);
      }
    }
  }

  /**
   * Handles a single event
   */
  private async _handleEvent(action: A): Promise<void> {
    const eventConstructor = action.constructor as new (...args: any[]) => A;
    const handler = this.eventHandlers.get(eventConstructor);

    if (handler) {
      const emit = (newState: S): void => {
        const previousState = this.state;
        this._pushState(newState, previousState, action);
      };

      try {
        await handler(action, emit);
      } catch (error) {
        const constructorName = eventConstructor.name || 'UnnamedEvent';
        
        Blac.error(
          `[Bloc ${this._name}:${String(this._id)}] Error in handler for '${constructorName}':`,
          error,
        );

        // Notify plugins
        if (error instanceof Error) {
          this._plugins.notifyError(error, {
            phase: 'event-processing',
            operation: 'handler',
            metadata: { event: action },
          });

          Blac.instance.plugins.notifyError(error, this as any, {
            phase: 'event-processing',
            operation: 'handler',
            metadata: { event: action },
          });
        }

        // Re-throw critical errors
        if (error instanceof Error && error.name === 'CriticalError') {
          throw error;
        }
      }
    } else {
      const constructorName = eventConstructor.name || 'UnnamedEvent';
      Blac.warn(
        `[Bloc ${this._name}] No handler for event: '${constructorName}'`,
      );
    }
  }

  /**
   * Registers an event handler
   */
  protected on<E extends A>(
    eventConstructor: new (...args: any[]) => E,
    handler: (event: E, emit: (newState: S) => void) => void | Promise<void>,
  ): void {
    if (this.eventHandlers.has(eventConstructor)) {
      Blac.warn(
        `[Bloc ${this._name}] Overwriting handler for: ${eventConstructor.name}`,
      );
    }
    
    this.eventHandlers.set(
      eventConstructor,
      handler as (event: A, emit: (newState: S) => void) => void | Promise<void>,
    );
  }

  /**
   * Simplified event dispatch - no more complex queue management
   */
  public add = (action: A): void => {
    if (this.isDisposed) {
      Blac.warn(`[Bloc ${this._name}] Cannot add event to disposed bloc`);
      return;
    }

    // Transform event through plugins
    let transformedAction: A | null = action;
    try {
      transformedAction = (this._plugins as any).transformEvent(action);
    } catch (error) {
      console.error('Error transforming event:', error);
    }

    if (transformedAction === null) return;

    // Notify plugins
    try {
      (this._plugins as any).notifyEvent(transformedAction);
    } catch (error) {
      console.error('Error notifying plugins of event:', error);
    }

    // Notify system plugins
    Blac.instance.plugins.notifyEventAdded(this as any, transformedAction);

    // Send event to channel
    this._eventSender(transformedAction);
  };

  /**
   * Returns an async generator that yields all events
   * Primary API for observing events
   */
  async *events(): AsyncGenerator<A, void, void> {
    if (this.isDisposed) return;

    for await (const event of this._eventStreamChannel.generator) {
      yield event;
      if (this.isDisposed) break;
    }
  }

  /**
   * Returns an async generator that yields events of a specific type
   */
  async *eventsOfType<E extends A>(
    EventType: new (...args: any[]) => E,
  ): AsyncGenerator<E, void, void> {
    for await (const event of this.events()) {
      if (event instanceof EventType) {
        yield event as E;
      }
    }
  }
}