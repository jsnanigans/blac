/**
 * Base type for discriminated union events.
 * All events must have a `type` property as the discriminator.
 *
 * @example
 * ```typescript
 * type MyEvent =
 *   | { type: 'increment'; amount: number }
 *   | { type: 'decrement' };
 * ```
 */
export interface DiscriminatedEvent {
  readonly type: string;
}

/**
 * Metadata automatically attached to events during processing.
 * @internal
 */
export interface EventMetadata {
  readonly timestamp?: number;
  readonly source?: string;
}

/**
 * Event with metadata attached after enrichment.
 * @internal
 */
export type EventWithMetadata<E extends DiscriminatedEvent> = E & EventMetadata;

/**
 * Extract the `type` literal union from a discriminated event union.
 *
 * @template E - The discriminated event union type
 *
 * @example
 * ```typescript
 * type MyEvent = { type: 'a' } | { type: 'b' };
 * type Types = EventType<MyEvent>; // 'a' | 'b'
 * ```
 */
export type EventType<E extends DiscriminatedEvent> = E['type'];

/**
 * Extract a specific event variant from a union by its type.
 *
 * @template E - The discriminated event union type
 * @template T - The type literal to extract
 *
 * @example
 * ```typescript
 * type MyEvent = { type: 'a'; value: number } | { type: 'b' };
 * type EventA = ExtractEvent<MyEvent, 'a'>; // { type: 'a'; value: number }
 * ```
 */
export type ExtractEvent<
  E extends DiscriminatedEvent,
  T extends EventType<E>,
> = Extract<E, { type: T }>;

/**
 * Handler function for processing a specific event type.
 * @internal
 */
export type VertexEventHandler<
  E extends DiscriminatedEvent,
  S extends object,
> = (event: E, emit: (state: S) => void) => void;

/**
 * Map of event handlers requiring exhaustive coverage.
 * TypeScript enforces that every event type in the union has a handler.
 *
 * @template E - The discriminated event union type
 * @template S - The state type
 *
 * @example
 * ```typescript
 * type CounterEvent =
 *   | { type: 'increment'; amount: number }
 *   | { type: 'reset' };
 *
 * // All event types must be handled:
 * const handlers: EventHandlerMap<CounterEvent, { count: number }> = {
 *   increment: (event, emit) => emit({ count: event.amount }),
 *   reset: (_, emit) => emit({ count: 0 }),
 * };
 * ```
 */
export type EventHandlerMap<E extends DiscriminatedEvent, S extends object> = {
  [K in EventType<E>]: VertexEventHandler<ExtractEvent<E, K>, S>;
};
