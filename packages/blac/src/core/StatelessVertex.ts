import { StateContainer } from './StateContainer';
import { globalRegistry } from './StateContainerRegistry';
import { STATELESS_MARKER } from './StatelessCubit';
import type {
  DiscriminatedEvent,
  EventWithMetadata,
} from '../types/events';

/**
 * Empty state type used internally by stateless containers.
 * @internal
 */
type EmptyState = Record<never, never>;

/**
 * Event handler for StatelessVertex that receives only the event (no emit function).
 * Use for side-effect-only event processing.
 */
export type StatelessEventHandler<E extends DiscriminatedEvent> = (
  event: EventWithMetadata<E>,
) => void;

/**
 * Map of event types to their handlers for StatelessVertex.
 * Enforces exhaustive handling of all event types in the union.
 */
export type StatelessEventHandlerMap<E extends DiscriminatedEvent> = {
  [K in E['type']]: StatelessEventHandler<Extract<E, { type: K }>>;
};

/**
 * An event-driven container without state management capabilities.
 * Use this for event processing that only produces side effects (logging, analytics, etc).
 *
 * StatelessVertex:
 * - Processes events via `add()` method
 * - Handlers receive only the event (no `emit` function)
 * - Has no accessible `state` property
 * - Cannot be subscribed to (throws error)
 * - Is rejected by `useBloc` hook (use `useBlocActions` instead)
 *
 * @template E - Event union type (discriminated by 'type' property)
 * @template P - Props type (optional)
 *
 * @example
 * ```typescript
 * type LogEvent =
 *   | { type: 'info'; message: string }
 *   | { type: 'error'; message: string; error: Error }
 *   | { type: 'warn'; message: string };
 *
 * class LoggingVertex extends StatelessVertex<LogEvent> {
 *   constructor() {
 *     super();
 *     this.createHandlers({
 *       info: (event) => console.log('[INFO]', event.message),
 *       error: (event) => console.error('[ERROR]', event.message, event.error),
 *       warn: (event) => console.warn('[WARN]', event.message),
 *     });
 *   }
 *
 *   info = (message: string) => this.add({ type: 'info', message });
 *   error = (message: string, error: Error) => this.add({ type: 'error', message, error });
 *   warn = (message: string) => this.add({ type: 'warn', message });
 * }
 *
 * // In React component:
 * const logger = useBlocActions(LoggingVertex);
 * logger.info('Page loaded');
 * ```
 */
export abstract class StatelessVertex<
  E extends DiscriminatedEvent = DiscriminatedEvent,
  P = undefined,
> extends StateContainer<EmptyState, P> {
  /**
   * Marker property to identify stateless containers.
   * @internal
   */
  static readonly [STATELESS_MARKER] = true as const;

  /** @internal */
  private handlers = new Map<
    string,
    StatelessEventHandler<DiscriminatedEvent>
  >();
  /** @internal */
  private isProcessing = false;
  /** @internal */
  private eventQueue: EventWithMetadata<E>[] = [];

  constructor() {
    super({});
  }

  /**
   * State is not available on StatelessVertex.
   * @throws Always throws an error when accessed.
   */
  override get state(): never {
    throw new Error(
      `${this.name} is a StatelessVertex and does not have state. ` +
        'Use a regular Vertex if you need state management.',
    );
  }

  /**
   * Subscriptions are not available on StatelessVertex.
   * @throws Always throws an error when called.
   */
  override subscribe(_listener: (state: EmptyState) => void): never {
    throw new Error(
      `${this.name} is a StatelessVertex and does not support subscriptions. ` +
        'Use useBlocActions() instead of useBloc() in React.',
    );
  }

  /**
   * Register all event handlers with exhaustive type checking.
   * TypeScript will error if any event type from the union is missing.
   *
   * Unlike regular Vertex, handlers do NOT receive an emit function
   * since StatelessVertex cannot emit state.
   *
   * @param handlers - Map of event type to handler function
   */
  protected createHandlers(handlers: StatelessEventHandlerMap<E>): void {
    for (const [eventType, handler] of Object.entries(handlers)) {
      this.handlers.set(
        eventType,
        handler as StatelessEventHandler<DiscriminatedEvent>,
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
    globalRegistry.emit('eventAdded', this, enrichedEvent);
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

    try {
      handler(event);
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

  /**
   * emit() is not available on StatelessVertex.
   * @internal
   */
  protected override emit(_newState: never): never {
    throw new Error(
      `${this.name} is a StatelessVertex and does not support emit(). ` +
        'Use a regular Vertex if you need state management.',
    );
  }

  /**
   * update() is not available on StatelessVertex.
   * @internal
   */
  protected override update(_updater: never): never {
    throw new Error(
      `${this.name} is a StatelessVertex and does not support update(). ` +
        'Use a regular Vertex if you need state management.',
    );
  }
}
